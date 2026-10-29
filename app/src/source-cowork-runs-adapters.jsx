// Local services for the 3.6556.2 Cowork activity panel's Runs and Upcoming sections, which
// scripts/extract-cowork-runs.mjs emits into src/generated/cowork-runs (w13-coworkui-runs: c21f11e6d Ew / eT). Each
// export replaces one original declaration, which the extractor feature-checks (see its `adapters` table). OpenClaude has
// no claude.ai account or remote (CCR) scheduled tasks (E59): the runs of a scheduled task come from the local scheduler
// (electron/local-routines.mjs through useLocalRoutines), shaped by src/cowork-runs-model.mjs. The intl, link and "now"
// answers are routines-shared's (src/source-routines-shared-adapters.jsx); a run link (`/cowork/<id>`) and the task chip
// (`/scheduled-task/<id>`) go to RoutinesSharedHost's navigate, which the panel provides.
import { createContext, useContext } from "react";

// The panel's runs data: { scheduledTasks, sessions, readState } (cowork-runs-model.mjs coworkRunsData).
const EMPTY = Object.freeze({ scheduledTasks: Object.freeze([]), sessions: Object.freeze([]), readState: null });
export const CoworkRunsHost = createContext(EMPTY);
const useRuns = () => useContext(CoworkRunsHost) ?? EMPTY;

// shared-78 yE (Ar): whether scheduled tasks are on (`{ loading, enabled, statusUnknown }`, from the yukon_silver gate and
// the session host). Ew passes `enabled` to Xi, which reads it only for a remote task; the local scheduler always runs
// here, so the official "served" answer.
const SCHEDULED_TASKS_ON = Object.freeze({ loading: false, enabled: true, statusUnknown: false });
export const useCoworkScheduledTasksStatus = () => SCHEDULED_TASKS_ON;

// shared-78 gK (Or): whether the panel sits in the desktop frame. The same answer cowork-progress gives the sections
// beside this one (the dframe-card surface): one implementation.
export { useDesktopFrame } from "./source-cowork-progress-v3-adapters.jsx";

// shared-4 l_ (zi): the scheduled task's display name — `scheduledTasks.find(t => t.id === id)?.displayName`, else (once
// resolved, for a local id) uo(id). Here the local tasks the panel lists (displayName = the task name); an unknown id
// answers undefined, so jw shows the plain "Runs" title (`n === void 0 ? g : …`) and no task chip.
export function useScheduledTaskDisplayName(id) {
  const { scheduledTasks } = useRuns();
  if (!id) return undefined;
  return scheduledTasks.find((task) => task.id === id)?.displayName;
}

// shared-4 R_ (Xi): the sessions a scheduled task started, `{ sessions, isLoading }` (remote through the trigger query,
// local through L_; neither for no task). Here the local runs (one session per run with a thread), already shaped like the
// official list rows by cowork-runs-model.mjs; nothing loads asynchronously, so isLoading is false.
export function useScheduledTaskSessions(id) {
  const { sessions } = useRuns();
  return { sessions: id ? sessions : EMPTY.sessions, isLoading: false };
}

// shared-2 OG (Js): the zustand store of the session read state (`{ readState: null, viewingChats, tracking }`). Ew reads
// it with a selector (Ow: `e => e.readState`); the host keeps the read state itself (cowork-home-model.mjs's
// `{ initializedAt, sessions }` shape), so the selector runs over the panel's value.
export function useCoworkRunsReadState(selector) {
  const { readState } = useRuns();
  const state = { readState: readState ?? null };
  return typeof selector === "function" ? selector(state) : state;
}
