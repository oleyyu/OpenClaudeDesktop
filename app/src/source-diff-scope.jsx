import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_DIFF_SCOPE, DIFF_SCOPE_LABELS, UNCOMMITTED_DIFF_SCOPE, commitScopeGone, diffScopeParam, diffScopePick, diffScopeSections, diffScopeTrigger,
  resolveDiffScope, uncommittedScopeAvailable,
} from "./diff-scope-model.mjs";
import { rememberDiffScope, useStoredDiffScope } from "./generated/files-changes/diff-scope-memory.mjs";
import { onSessionEvicted } from "./source-files-changes-adapters.jsx";
import { asElementNode, CdsDropdown, CdsIcon, CdsTooltip, useCdsOwnerWindow, useCdsOwnerWindowAnchor } from "./generated/view-tabs/index.js";
import { createPreviewPaneMenu } from "./generated/code-editor/preview-pane-menu.mjs";
import { suppressNativeContextMenu } from "./generated/files-changes/menu-context-guard.mjs";
import { menuCollisionPadding } from "./generated/code-composer/menu-collision-padding.mjs";
import { scopeLabelClipped } from "./generated/files-changes/diff-scope-label.mjs";
import { hostGrowthBookFlag } from "./host-growthbook.mjs";
import "./source-diff-scope.css";

// 3.6556.2 cccc2cf0a $S renders its menu as `u(qv, {sections: L, portalContainer: a})` in `H.Popup`, where qv is
// ca5db7aaf U (exported `n`): the sections over CdsDropdown (`Jo as d`), rows Z, searchable submenus J / X (d.SearchablePopup,
// maxVisibleItems 10.5). That original is generated once, as code-editor/preview-pane-menu.mjs's `Sections` (D1); here its
// factory gets ca5db7aaf's own shared-frame imports from view-tabs: Menu = CdsDropdown (Jo), Tooltip = CdsTooltip (Kl),
// useOwnerWindow = useCdsOwnerWindow (Nd), asElement = asElementNode (Iu). Only Sections is used (not the pane trigger H).
const { Sections: DiffScopeSections } = createPreviewPaneMenu({ Menu: CdsDropdown, Tooltip: CdsTooltip, useOwnerWindow: useCdsOwnerWindow, asElement: asElementNode });

// The model's labels are strings; a row whose original label is an element — YS's "diff-base-note" (`span.animate-
// placeholder-reveal` while loading, else a Fragment) and $S's "more-commits" FormattedMessage — is marked
// `searchable: false` there and becomes that element here, so ca5db7aaf K (string labels only) skips it in a search.
function cdsItem(item) {
  const children = item.items ? { items: item.items.map(cdsItem) } : null;
  if (item.searchable === false) {
    const { searchable: _searchable, note, ...rest } = item;
    const label = note === "loading" ? <span className="animate-placeholder-reveal">{item.label}</span> : <>{item.label}</>;
    return { ...rest, ...children, label };
  }
  return children ? { ...item, ...children } : item;
}
export const diffScopeMenuSections = (sections) => sections.map((section) => ({ ...section, items: section.items.map(cdsItem) }));

// 3.6556.2 c03935b01 $n `return !v("__gb__3676555858")` (cccc2cf0a $S `f = Ul()`): the scope menu is offered unless that
// GrowthBook flag is on; the host answers every flag from host-growthbook.mjs, where an unlisted flag is off.
export const DIFF_SCOPE_MENU_OFF_FLAG = "__gb__3676555858";
export const diffScopeMenuEnabled = () => !hostGrowthBookFlag(DIFF_SCOPE_MENU_OFF_FLAG);

// 3.6556.2 cccc2cf0a rC: one CdsDropdown Root holds the Tooltip-wrapped trigger and the menu Popup; the tooltip is held
// closed while the menu is open (`o = !i && void 0`, `u(ee, {content: t, open: o, children: n})`, `h(H.Root, {open: i,
// onOpenChange: a, children: [s, r]})`).
function DiffScopeMenuRoot({ tooltip, trigger, children }) {
  const [open, setOpen] = useState(false);
  return <CdsDropdown.Root open={open} onOpenChange={setOpen}>
    <CdsTooltip content={tooltip} open={!open && undefined}>{trigger}</CdsTooltip>
    {children}
  </CdsDropdown.Root>;
}

/** 3.6556.2 cccc2cf0a $S (trigger + menu) and rC (menu root, tooltip). `trigger` from diffScopeTrigger, `sections` from
 * diffScopeSections.
 * - q: `grid min-w-0 grid-cols-[minmax(0,max-content)_auto_minmax(0,max-content)] items-center gap-xs` of two
 *   `min-w-0 truncate ${B}` spans (B = `f ? ii("text-secondary") : "text-secondary"`; shared-18 Mb answers
 *   "text-secondary" while fizzy `panels` is off, the local case) around an xs ArrowRight (alt "to", text-muted-as-secondary).
 * - !f (the scope menu flagged off): q alone in `flex min-w-0 items-center text-body text-muted-as-secondary`, no button.
 * - f: `H.TriggerButton` (CdsDropdown, ghost) `shrink min-w-0 ${ii("text-secondary")}`, aria-label "Diff scope: {J}",
 *   holding q for the branch scope, else `<span className="min-w-0 truncate">{J}</span>`; J is the branch label,
 *   "Uncommitted changes", or iC's commit label. The tooltip's content is J while one of the label spans is clipped (QS).
 *   The menu is `H.Popup` {onContextMenu: Jv (ca5db7aaf P), side bottom, align start, container: Id(), collisionPadding:
 *   shared-18 Sn} over qv. */
export function SourceDiffScope({ trigger, sections = [] }) {
  const container = useCdsOwnerWindowAnchor();
  const baseRef = useRef(null), headRef = useRef(null), labelRef = useRef(null);
  const menuSections = useMemo(() => diffScopeMenuSections(sections), [sections]);
  if (!trigger) return null;
  const range = trigger.range ?? trigger.branch;
  const part = "min-w-0 truncate text-secondary";
  const grid = <span className="grid min-w-0 grid-cols-[minmax(0,max-content)_auto_minmax(0,max-content)] items-center gap-xs">
    <span ref={baseRef} className={part}>{range?.base}</span>
    <CdsIcon name="ArrowRight" size="xs" alt={DIFF_SCOPE_LABELS.to} className="text-muted-as-secondary" />
    <span ref={headRef} className={part}>{range?.head}</span>
  </span>;
  if (!diffScopeMenuEnabled()) return <span className="flex min-w-0 items-center text-body text-muted-as-secondary">{grid}</span>;
  // eC over [o, s, c]: the label is the tooltip only while a span is clipped; undefined cancels the open.
  const tooltip = () => ([baseRef, headRef, labelRef].some((ref) => scopeLabelClipped(ref.current)) ? trigger.label : undefined);
  return <DiffScopeMenuRoot tooltip={tooltip}
    trigger={<CdsDropdown.TriggerButton variant="ghost" className="shrink min-w-0 text-secondary" aria-label={trigger.ariaLabel}>
      {trigger.branch ? grid : <span ref={labelRef} className="min-w-0 truncate">{trigger.label}</span>}
    </CdsDropdown.TriggerButton>}>
    <CdsDropdown.Popup onContextMenu={suppressNativeContextMenu} side="bottom" align="start" container={container} collisionPadding={menuCollisionPadding}>
      <DiffScopeSections sections={menuSections} portalContainer={container} />
    </CdsDropdown.Popup>
  </DiffScopeMenuRoot>;
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
  // YS `a` (the session repo) for c5da7eb42 Zf: git-status.cjs reports a detached HEAD as `detached: true` with the short
  // HEAD sha as `branch`, the host's value of the official detachedHead repo's branch.
  const detachedBranch = status?.detached ? status.branch || undefined : undefined;
  const repo = useMemo(() => (detachedBranch === undefined ? undefined : { detachedHead: true, branch: detachedBranch }), [detachedBranch]);
  const trigger = isRepo ? diffScopeTrigger(scope, { base, commits: commitList, repo }) : null;
  const sections = useMemo(() => !trigger ? [] : diffScopeSections({
    scope, base, defaultBase, overridden: !!override, current, uncommittedAvailable, commits: commitList, commitTotal, branches: branchState, repo,
    onSelectScope: (next, meta) => pickScope(next, meta?.via),
    onSelectBase: (name) => update({ base: name || undefined }),
    // Im I(): opening the list drops an override that names the checked-out branch, then refetches.
    onBaseMenuOpen: () => { if (override && override === current) update({ base: undefined }); loadBranches(); },
  }), [trigger?.ariaLabel, scope, base, defaultBase, override, current, uncommittedAvailable, commitList, commitTotal, branchState, repo, update, pickScope, loadBranches]);
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
