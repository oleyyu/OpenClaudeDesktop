// The Preview start page when the project has no .claude/launch.json, and its dev-server detection: 2.31226.0
// cf580efe9 gr (start page), fr (detection), dr (candidate row) and their message maps ir / ar / sr
// (analysis/code-ui-sync-20261013/readable/cf580efe9-Cz_m1KNC.js.readable.js 286-760), plus the Dev servers
// trigger's visibility (Xr xt, 2260-2290). Pure: the pane (source-preview-pane.jsx) renders these and translates the
// English strings with t().

// sr: the framework captions ("unknown" has none and reads "port {port}").
export const FRAMEWORK_LABELS = Object.freeze({
  next: "Next.js", vite: "Vite", nuxt: "Nuxt", astro: "Astro", svelte: "SvelteKit", angular: "Angular", remix: "Remix", gatsby: "Gatsby",
});
// ir: why a candidate can't be used (validation.reason from preview-launch.mjs validateServerCandidate).
export const CANDIDATE_PROBLEMS = Object.freeze({
  "shell-metachar": "Command contains shell operators",
  "runner-not-allowed": "Runner isn’t a recognized package manager",
  "port-out-of-range": "Port is out of range",
});
// ar: why "Use this" didn't save (preview-service.cjs preview-use-server reasons; any other reads write-failed).
export const ADD_SERVER_ERRORS = Object.freeze({
  "name-exists": "A server with this name already exists in .claude/launch.json.",
  "write-failed": "Couldn’t save this configuration. Try again.",
});

/** cr: the command a candidate runs, as the row shows it. */
export function candidateCommand(candidate) {
  return [candidate.runtimeExecutable, ...(candidate.runtimeArgs ?? [])].join(" ");
}

/** dr: what one candidate row shows — caption parts, the command, and the problem (no Use button) when blocked. */
export function candidateRow(candidate) {
  const blocked = candidate.validation?.status !== "ok";
  const reason = candidate.validation?.reason;
  return {
    blocked,
    framework: FRAMEWORK_LABELS[candidate.framework] ?? null,
    port: candidate.port,
    command: candidateCommand(candidate),
    problem: blocked && reason && Object.hasOwn(CANDIDATE_PROBLEMS, reason) ? CANDIDATE_PROBLEMS[reason] : null,
  };
}

/** The detection IPC's answer as a candidate list (anything malformed dropped). */
export function detectedCandidates(result) {
  if (!Array.isArray(result)) return [];
  return result.filter((candidate) => candidate && typeof candidate === "object" && typeof candidate.name === "string"
    && typeof candidate.runtimeExecutable === "string" && Array.isArray(candidate.runtimeArgs)
    && candidate.validation && typeof candidate.validation.status === "string");
}


/** ar lookup: the save error's message (unknown reasons read as write-failed). */
export function addServerErrorText(reason) {
  return ADD_SERVER_ERRORS[Object.hasOwn(ADD_SERVER_ERRORS, reason) ? reason : "write-failed"];
}

/**
 * fr N (inverted): the detection subtree replaces the start page's title, body and prompt (gr detectionActive) once
 * it has candidates or a save error to show. `candidates` is null until the first scan answers.
 */
export function detectionActive({ candidates, addError }) {
  return !((candidates === null || candidates.length === 0) && addError === null);
}

/** The scan's restart key (fr's effect deps [cwd, sessionId]): a new key throws away an answer still in flight. */
export function detectionKey(sessionId, cwd) {
  return `${sessionId ?? ""}\0${cwd ?? ""}`;
}

/**
 * Xr xt: the Dev servers trigger only shows when its menu has something — a server to list, or Add server. With
 * none (no launch.json, nothing running, the agent can't be asked) the reference hides it.
 */
export function serverTriggerVisible({ rows, canAddServer }) {
  return (rows?.length ?? 0) > 0 || !!canAddServer;
}

/**
 * Xr's r() effect: when the trigger disappears while it had focus (focus fell to <body>), focus moves to the first
 * enabled button left in the header group. `hadTrigger`/`hasTrigger` are the previous and current visibility.
 */
export function shouldHandOffFocus({ hadTrigger, hasTrigger, activeIsBody }) {
  return !!hadTrigger && !hasTrigger && !!activeIsBody;
}
