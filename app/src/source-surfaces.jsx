import React, { useEffect, useMemo, useRef, useState } from 'react';
// w13-coworkui-panel: the 3.6556.2 session activity panel (c21f11e6d AT) over the sections the W13 lanes generated —
// cowork-progress (vT Progress, xT Outputs / Working folder, kT / Bb dialogs, cc5a62f6f F / L / contexts), cowork-runs
// (Ew Runs, eT Upcoming), cowork-live (hb Claude in Chrome, bb Computer use, pb the running signal) and cowork-context
// (TT Context) — and the home column, layout table and greeting (scripts/extract-cowork-home.mjs).
import { CoworkProgressSection as ProgressSection, CoworkOutputsSection as OutputsSection, CoworkPanel as Panel,
  CoworkFolderInstructionsDialog as FolderInstructionsDialog, CoworkFileBrowserDialog as FileBrowserDialog,
  CoworkPanelMergedContext as MergedContext, CoworkPanelLayoutContext as LayoutContext,
  coworkPanelCardLayout as cardLayout } from './generated/cowork-progress/index.mjs';
// cc5a62f6f `re` (official export m, AT's Xh): the section-header toggle display context, by its published name.
import { CoworkPanelSectionToggleContext as SectionToggleDisplayContext } from './generated/cowork-progress/index.mjs';
import { CoworkRunsSection as RunsSection, CoworkUpcomingSection as UpcomingSection } from './generated/cowork-runs/index.mjs';
import { CoworkBrowserSection as BrowserSection, CoworkComputerUseSection as ComputerUseSection,
  useCoworkToolRunning, useCoworkBrowserActivityText, useCoworkBrowserScreenshot } from './generated/cowork-live/index.mjs';
import { CoworkContextSection as ContextSection } from './generated/cowork-context/index.mjs';
import { CdsTooltipProvider } from './generated/view-tabs/index.js';
import { HomeColumn, homeLayout, homeBannerOffsetClass as bannerOffset, homeDockHeightClass as dockHeight,
  homeColumnClass } from './generated/cowork-home/index.mjs';
import { SourceChatGreeting } from './source-chat-home.jsx';
import { FileSystem } from './source-cowork-progress-v3-adapters.jsx';
import { CoworkRunsHost } from './source-cowork-runs-adapters.jsx';
import { coworkLiveActivity, coworkLiveSectionProps, COMPUTER_USE_CARD_GATE } from './source-cowork-live-adapters.jsx';
import { coworkContextActivityClick } from './source-cowork-context-adapters.jsx';
import { RoutinesSharedHost } from './source-routines-shared-adapters.jsx';
import { useLocalRoutines } from './use-local-routines.jsx';
import { coworkOutputsData, coworkFolderExpanded, toggleCoworkFolder } from './cowork-outputs-model.mjs';
import { coworkContextData } from './cowork-context-model.mjs';
import { coworkRunsData, coworkRunsRoute } from './cowork-runs-model.mjs';
import { coworkHomeState } from './cowork-home-model.mjs';
import { itemDeliverables } from './deliverable-records.mjs';
import { planStepStatus } from './source-plan-checklist.jsx';
import { t } from '../electron/i18n/index.mjs';
import './source-surfaces.css';

export { homeScrollClass } from './generated/cowork-home/index.mjs';
// 3.6556.2 shared-23 new page: the scrolling viewport (homeScrollClass) holds shared-18 AC (Gd) with
// o("relative flex flex-col items-center gap-6 max-sm:!px-1 md:px-14", `${zg(n).columnTopOffsetClass} ${mg}`, NC, cu)
// — the new-page layout (shared-19 rS / nS), the banner offset (shared-19 Rx, mg) and the dock height (shared-5 HS, cu).
// The layout is "classic" (w11-sweep-curchat, E53): shared-23 WC takes `n === void 0 ? zl : n` with zl = shared-2 M1
// "classic", shared-2 B1 reads data-new-page-layout / the new-page-layout-latch (both "classic" unless set), and "home"
// is the GrowthBook new_page_home arm (shared-3 `flag:"__gb__1085985672",label:"new_page_home"`; shared-21 hD
// homeLayoutLive needs a.gateOn), off by default here (D29/D31). Local transcripts keep their own scroll host.
const homeVariant = homeLayout('classic');
export function SourceSurfaceHome({ active, children }) {
  if (!active) return children;
  return <HomeColumn className={`surface-home-column ${homeColumnClass} ${homeVariant.columnTopOffsetClass} ${bannerOffset} ${dockHeight}`}>
    {children}
  </HomeColumn>;
}

// w13-close-cowork-ui (chatui-home-01): the Cowork new page greets with the same shared-23 Fy as Chat. 3.6556.2 has one
// new page for both tabs (shared-23 UC, which also takes coworkTabLoadReportedRef) and one greeting call site,
// `c(Fy,{incognitoModeEnabled:u,planBadge:null,layout:e.greetingLockup})`; the "new-start-heading" host replaces it only
// for the hub start host (`x=_&&y?"hub":null`, a remote arm). Fy's text is Dy, whose only table lookup is
// `dy(…,"chat",l)` (no "cowork" lookup anywhere in ion-dist), so the Cowork greeting is the Chat one: "You’re here!"
// unless the local greeting table has a chat slot (source-chat-home.jsx, the same HomeGreeting in the same classic seat).
// 3.6556.2 has no `{name} returns!` (en-US 0 hits); a caller's `name` is not shown.
export function SourceSurfaceGreeting() {
  return <SourceChatGreeting />;
}

// --- The session activity panel (w13-coworkui-panel; cwui-10 / cwui-12) --------------------------------------------
// 3.6556.2 c21f11e6d AT (readable :11590-13030), the arm this host takes. headerHosted (`o`, Ya.headerHosted = CM(…))
// is false here: CM is `hasHeader && (eligible || treated) || hasHeader && rowsRuled && …`, where eligible is the hub
// gate (shared-78 lv: marble_heron / dusky_lapwing / __gb__1174351393), treated is GrowthBook __gb__615224538 (aP) and
// rowsRuled is the "panels" fizzy-lake part (shared-4 vm) — all off (R15 / E12). So the panel is the docked column:
//   - ht (the floating / shrinking arms ft / ut / pt all need `o`) is false, so `gt(e, t = "24rem")` is
//     `{ maxContentHeight: t }` and the Panel does not shrink its sections;
//   - the section-header toggles show `wi = o ? (xi <= 1 ? "none" : "hover") : "always"`;
//   - the layout is Gh = `o ? ng : Yh` = Yh (cc5a62f6f S, the card layout), merged into one card (qh true);
//   - the Panel chrome is `vt = ht ? void 0 : o ? Uh : Se ? Qp : Qh` with Se the desktop frame: Qp, shared-16 Nc;
//   - the in-panel toggle (`!Oe && …`, Oe = `!a && !o && (Se || xe)`) is not rendered: the title bar has it.
const headerHosted = false;
const PANEL_WIDTH = '20rem'; // aT
const PANEL_CHROME = 'dframe-card rounded-lg bg-[var(--df-sidebar-bg,var(--cds-surface-1))] [box-shadow:var(--df-shadow-card,none)]'; // Nc
const sectionHeight = (_count, fallback = '24rem') => ({ maxContentHeight: fallback }); // gt with ht false
const sectionToggles = headerHosted ? 'hover' : 'always'; // wi
// shared-52 nk: a folder's display name (AT si = `Tn(oe[0]) || oe[0]` for one selected folder).
const folderName = folder => {
  const trimmed = folder.replace(/[\\/]$/, '');
  const at = Math.max(trimmed.lastIndexOf('/'), trimmed.lastIndexOf('\\'));
  return at === -1 ? trimmed : trimmed.slice(at + 1);
};
const noCall = async () => [];
// w13-close-cowork-ui (coworkui-panel-04): AT takes `onRevealStep: F, canRevealStep: I` from its caller and hands the Context
// section `Bt = F && (e => { F(e), Rt() })` with `canRevealStep: I`. A Context row's step is the transcript item that made it
// (cowork-context-model.mjs ids: the item id, or `<item id>:<path>` for a memory file change), found by the row's
// data-transcript-item-id; a row whose item is not on screen (a collapsed tool group) can't be revealed and opens its file.
export function coworkStepRow(root, stepId) {
  if (!root?.querySelector || typeof stepId !== 'string' || !stepId) return null;
  const find = id => root.querySelector(`.transcript [data-transcript-item-id="${CSS.escape(id)}"]`);
  const path = stepId.indexOf(':/'), colon = path > 0 ? path : stepId.indexOf(':');
  return find(stepId) ?? (colon > 0 ? find(stepId.slice(0, colon)) : null);
}
/** Scroll a Context row's step into view and focus it (as the plan review's "Open plan" does). True when it was found. */
export function revealCoworkStep(root, stepId) {
  const row = coworkStepRow(root, stepId);
  if (!row) return false;
  row.scrollIntoView({ block: 'start' });
  if (!row.hasAttribute('tabindex')) row.setAttribute('tabindex', '-1');
  row.focus({ preventScroll: true });
  return true;
}
const NO_ROWS = [];
const NO_STEPS = []; // a plan that is neither a list nor { plan: [...] }: one stable empty list, so the todos memo holds
const NO_GATES = {}; // GrowthBook / dynamic config answers for the sections: all off (R15)

// cc5a62f6f I (AT rg): `[flag, snap]` — snap() raises the flag for two animation frames (the section skips its
// open transition while it follows the panel's own expansion).
function useSeedSnap() {
  const [held, setHeld] = useState(false);
  useEffect(() => {
    if (!held) return;
    let inner = 0;
    const outer = requestAnimationFrame(() => { inner = requestAnimationFrame(() => setHeld(false)); });
    return () => { cancelAnimationFrame(outer); cancelAnimationFrame(inner); };
  }, [held]);
  return [held, () => setHeld(true)];
}

// AT's Progress expansion (readable :12240-12253): collapsed until the first todos arrive, then open unless they are
// all done; later, all-done collapses and new work reopens. (The conversation-change branch Et does not apply: the
// host keys the panel by session.)
function useProgressExpansion(todos, allDone) {
  const [open, setOpen] = useState(false);
  const [hadTodos, setHadTodos] = useState(false);
  const [disableTransition, snap] = useSeedSnap();
  if (todos.length > 0 && !hadTodos) {
    setHadTodos(true);
    if (!allDone !== open) { if (!disableTransition) snap(); setOpen(!allDone); }
  }
  const last = useRef(todos.length > 0 ? allDone : null);
  useEffect(() => {
    const previous = last.current;
    if (previous === null && todos.length === 0) return;
    last.current = allDone;
    if (previous === null) return;
    if (allDone && !previous) setOpen(false);
    else if (!allDone && previous && todos.length > 0) setOpen(true);
  }, [allDone, todos.length]);
  return { open, setOpen, disableTransition };
}

// AT's Outputs expansion (:11866 and :12228-12239): open from the start with several folders (or connected Office
// files, none here); then open once the session has outputs and close when they are gone. The transcript is hydrated
// (`Ui`), so the render-phase branch only records that outputs were seen.
function useOutputsExpansion(hasOutputs, multipleFolders) {
  const [open, setOpen] = useState(() => multipleFolders);
  const seen = useRef(false);
  useEffect(() => {
    if (hasOutputs && !seen.current) setOpen(true);
    else if (!hasOutputs && seen.current) setOpen(false);
    seen.current = hasOutputs;
  }, [hasOutputs]);
  return [open, setOpen];
}

/**
 * The Cowork session activity panel: AT's section order and conditions over this host's session.
 *   1 Runs (Ew)              `de && …` — the local scheduled task one of whose runs is this session
 *   2 Upcoming (eT)          always mounted; null without a future send_later trigger
 *   3 Progress (vT)          `hi = !m && (!u || fi || pi)`
 *   4 remote outputs (ST)    `Bn` — never: sessions are local (cwui-18)
 *   5 Outputs (xT)           `!Bn && gi`, `gi = !u || di`
 *   6 in-app browser (kb/Ab) `cr` — appFeatures.coworkBrowser, off here
 *   7 Claude in Chrome (hb)  always mounted; renders with browser activity
 *   8 Computer use (bb)      `Vn && …` — GrowthBook cowork_computer_use_side_panel_card; main.jsx turns it on
 *                            (COWORK_PANEL_GATES, E63 coworkui-panel-live-05 B, with E49 / E53)
 *   9 Context (TT)           `_i = !u || oi`
 *  10 extra section (yi)     `Ha(q) ? co()?.Section : null` — the runtime's own section (shared-6 Nv); none here
 * hideEmptySections (`u`) is false, so the emptyState branch (`Si = u && xi === 0`) never shows.
 */
export function SourceCoworkProgress({ call = noCall, sessionId, plan, items = [], cwd, running, sessions, metadata, state,
  scheduledTasks, gates = NO_GATES, onOpenFile, onOpenSession, onOpenRoutine, onRevealStep, canRevealStep }) {
  const steps = Array.isArray(plan) ? plan : plan?.plan ?? NO_STEPS;
  const todos = useMemo(() => steps.map(step => ({ ...step, content: step.content ?? step.step, status: planStepStatus(step.status) })), [steps]);
  const allTodosCompleted = todos.length > 0 && todos.every(step => step.status === 'completed'); // Qi
  const progress = useProgressExpansion(todos, allTodosCompleted);

  // Outputs (xT) over cowork-outputs-model.mjs (w13-coworkui-outputs).
  const outputs = useMemo(() => coworkOutputsData({ items, cwd, sessionId, deliverables: itemDeliverables, gates, fileSystem: FileSystem }),
    [items, cwd, sessionId, gates]);
  const hasOutputs = outputs.outputResourcesActivity.length > 0 || outputs.scratchpadResourceActivity.length > 0
    || outputs.hasConnectedOfficeFiles || outputs.hasMultipleFolders || outputs.nonFileOutputs.length > 0 || outputs.hasWorkingDocuments; // di
  const [outputsOpen, setOutputsOpen] = useOutputsExpansion(hasOutputs, outputs.hasMultipleFolders);
  const [folderState, setFolderState] = useState({}); // Cn
  const [scratchpadOpen, setScratchpadOpen] = useState(false); // vn
  const [officeOpen, setOfficeOpen] = useState(true); // xn
  const [instructionsOpen, setInstructionsOpen] = useState(false); // On
  const [browserOpen, setBrowserOpen] = useState(false); // An
  const folders = outputs.userSelectedFolders;
  const workingFolderTitle = folders.length === 1 ? folderName(folders[0]) || folders[0] : null; // si
  // ca: reveal the first selected folder (the bridge's showInFolder); without one, the official opens the outputs
  // folder through openLocalFile, which this bridge does not have.
  const handleOpenFolder = event => { event?.stopPropagation?.(); if (folders.length > 0) FileSystem.showInFolder(folders[0]); };
  // Ca (Sa(e, "outputs_v2")): the official opens the file in the panel's drawer; here the host's file viewer.
  const handleOutputsActivityClick = activity => { if (activity?.filePath) onOpenFile?.(activity.filePath); };

  // Progress (vT): AT passes `disableTodoCommentAttachment: o` (the read-only flag, false for a live session); this host
  // has no composer attachment store for a todo comment (source-cowork-progress-v3-adapters.jsx useTodoCommentAttachment),
  // so it keeps the official disabled branch (host difference: no "Comment on this item").

  // Context (TT) over cowork-context-model.mjs (w13-coworkui-context).
  const context = useMemo(() => coworkContextData({ items, cwd, sessionId }), [items, cwd, sessionId]);
  const [contextOpen, setContextOpen] = useState(true); // gn = !collapseEmptyContext
  const handleContextActivityClick = activity => coworkContextActivityClick(activity, { onRevealStep, canRevealStep, onOpenFile });

  // Runs / Upcoming (Ew / eT) over cowork-runs-model.mjs (w13-coworkui-runs).
  // The local Cowork routines (electron/local-routines.mjs); `scheduledTasks` is a list the caller already loaded.
  const { tasks: loadedTasks } = useLocalRoutines(call, 'cowork');
  const tasks = scheduledTasks ?? loadedTasks;
  const rows = useMemo(() => (sessions && state ? coworkHomeState(sessions, metadata ?? {}, state).rows : NO_ROWS), [sessions, metadata, state]);
  const runs = useMemo(() => coworkRunsData({ tasks: tasks ?? [], sessionId, rows, metadata: metadata ?? {}, items }), [tasks, sessionId, rows, metadata, items]);
  const [runsOpen, setRunsOpen] = useState(true); // nn
  const [upcomingOpen, setUpcomingOpen] = useState(true); // an
  const routes = useRef(null);
  routes.current = { onOpenSession, onOpenRoutine };
  const routinesHost = useMemo(() => ({ navigate: href => {
    const route = coworkRunsRoute(href);
    if (route?.kind === 'session') routes.current.onOpenSession?.(route.id);
    else if (route?.kind === 'scheduled-task') routes.current.onOpenRoutine?.(route.id);
  }, pathname: '', search: '', bridge: undefined, models: [] }), []);

  // Claude in Chrome / Computer use (hb / bb) over source-cowork-live-adapters.jsx (w13-coworkui-panel-live).
  const isSessionActive = !!running; // Wr = isTurnLive ?? isSessionActive
  const activity = useMemo(() => coworkLiveActivity(items), [items]);
  // db (Ir / Lr): the latest Chrome action's official title (Dd) and the current domain (w13-close-rail-regen).
  const browserText = useCoworkBrowserActivityText(activity.resourceActivity);
  // sb (AT `n = sb(W)`, w13-close-cowork-ui panel-live-02): the newest Claude in Chrome result image.
  const browserScreenshot = useCoworkBrowserScreenshot(activity.resourceActivity);
  const live = coworkLiveSectionProps(activity, { sessionId, isSessionActive, panelShown: true, browserText, browserScreenshot });
  const isBrowserToolRunning = useCoworkToolRunning(activity.isBrowserToolPending, isSessionActive, sessionId); // Gr
  const isComputerUseToolRunning = useCoworkToolRunning(activity.isComputerUseToolPending, isSessionActive, sessionId); // qr
  const computerUseCard = gates[COMPUTER_USE_CARD_GATE] === true; // Vn

  // AT returns a fragment: the aside (`...oT`, data-activity-peek-zone; "h-full flex-shrink-0" with ht false, then
  // "relative z-20"; no overflow-hidden in the desktop frame while shown; width aT) and, beside it, the folder
  // instructions dialog (`Yr && !Bn && J && kT`) and the file browser (`Wn && Yr && Bb`).
  return <><aside data-activity-peek-zone="" className="cds-root h-full flex-shrink-0 relative z-20" data-density="comfortable"
    style={{ width: PANEL_WIDTH }} aria-label={t('Session activity panel')}>
    <div className="flex flex-col pe-[var(--df-pane-trailing-gutter,8px)] h-full ps-2 pt-0 pb-2" style={{ width: PANEL_WIDTH }}>
      <div className="overflow-y-auto flex-1 min-h-0 -ms-8 -me-2 ps-8 pe-2 pointer-events-none">
        <div className="flex flex-col gap-3 pt-2 pb-4 pointer-events-auto">
          <MergedContext.Provider value={true}><SectionToggleDisplayContext.Provider value={sectionToggles}>
            <LayoutContext.Provider value={cardLayout}><CdsTooltipProvider delay={300} closeDelay={150}>
              <RoutinesSharedHost.Provider value={routinesHost}><CoworkRunsHost.Provider value={runs.host}>
                <Panel chrome={PANEL_CHROME} shrinkSections={false}>
                  {runs.scheduledTaskId && <RunsSection scheduledTaskId={runs.scheduledTaskId} currentSessionId={sessionId}
                    isExpanded={runsOpen} onToggle={() => setRunsOpen(!runsOpen)} />}
                  <UpcomingSection triggers={runs.triggers} isExpanded={upcomingOpen} onToggle={() => setUpcomingOpen(!upcomingOpen)} />
                  <ProgressSection todos={todos} allTodosCompleted={allTodosCompleted} isExpanded={progress.open} setIsExpanded={progress.setOpen}
                    disableTransition={progress.disableTransition} headerHostedToggle={headerHosted} conversationUuid={sessionId}
                    sessionId={sessionId} isSessionActive={isSessionActive} disableTodoCommentAttachment
                    {...sectionHeight(todos.length, todos.length > 0 ? '24rem' : '12rem')} />
                  <OutputsSection {...outputs} workingFolderTitle={workingFolderTitle} headerHostedToggle={headerHosted}
                    isArtifactsExpanded={outputsOpen} setIsArtifactsExpanded={setOutputsOpen} artifactsSeedSnap={false}
                    conversationUuid={sessionId} sessionId={sessionId} handleOpenFileExplorer={() => setBrowserOpen(true)}
                    handleOpenFolder={handleOpenFolder} setIsFolderInstructionsModalOpen={setInstructionsOpen}
                    handleOutputsActivityClick={handleOutputsActivityClick} panelShown selectedPath={null}
                    isFolderExpanded={(folder, index) => coworkFolderExpanded(folderState, folder, index)}
                    toggleFolder={(folder, index) => setFolderState(value => toggleCoworkFolder(value, folder, index))}
                    isScratchpadExpanded={scratchpadOpen} setIsScratchpadExpanded={setScratchpadOpen}
                    isOfficeFilesExpanded={officeOpen} setIsOfficeFilesExpanded={setOfficeOpen}
                    handleOpenWorkingDocument={() => {}} handleOpenWorkingDocDraft={() => {}} isTranscriptHydrated watercolorHeld={false}
                    {...sectionHeight(0)} />
                  <BrowserSection key={`browser-${sessionId}`} {...live.browser} isBrowserToolRunning={isBrowserToolRunning} />
                  {computerUseCard && <ComputerUseSection key={`cu-${sessionId}`} {...live.computerUse}
                    activityKey={undefined} isComputerUseToolRunning={isComputerUseToolRunning} />}
                  <ContextSection {...context} isContextExpanded={contextOpen} setIsContextExpanded={setContextOpen} contextSeedSnap={false}
                    conversationUuid={sessionId} headerHostedToggle={headerHosted} onRevealStep={onRevealStep} canRevealStep={canRevealStep}
                    handleContextActivityClick={handleContextActivityClick} selectedPath={null} />
                </Panel>
              </CoworkRunsHost.Provider></RoutinesSharedHost.Provider>
            </CdsTooltipProvider></LayoutContext.Provider>
          </SectionToggleDisplayContext.Provider></MergedContext.Provider>
        </div>
      </div>
    </div>
  </aside>
    {folders.length > 0 && sessionId && <FolderInstructionsDialog isOpen={instructionsOpen} setIsOpen={setInstructionsOpen}
      folderPath={folders[0]} sessionId={sessionId} />}
    {outputs.fileExplorerAvailable && folders.length > 0 && <FileBrowserDialog isOpen={browserOpen} onClose={() => setBrowserOpen(false)}
      folders={folders} sessionId={sessionId} />}
  </>;
}

// w13-coworkui-placeholder (cwui-09): 3.6556.2 has no "in development" page (no chunk or en-US.json carries the old
// placeholder copy); the Cowork home is always the official home, and an unavailable Cowork answers with the
// official availability reason when a task starts (electron/cowork-runtime/engine-policy.mjs, w13-coworkfn-engine).
