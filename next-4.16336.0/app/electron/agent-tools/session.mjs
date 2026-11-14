// Claude Desktop's ccd_session tools for this session's transcript (2.2553.1 index.chunk-uZRTWaFR.js): mark_chapter
// (a chapter heading in the transcript, listed in the chapter menu) and spawn_task / dismiss_task (a "Suggested task"
// card the user can start as a new session, or dismiss). None of them does anything outside the transcript: a
// suggested task starts only when the user clicks Start. The renderer reads them back from the tool items
// (src/agent-tool-titles.mjs chapterOf / suggestedTasks).
// R4f-proposal: spawn_task's description, parameter descriptions and result follow 2.42304.0 (asar
// index.chunk-B5tintml.js Ex / Nx and the `Noted (position …` result): past 20 pending suggestions the oldest leaves the
// queue (Db) instead of the call being refused.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const group = "session";
export const MAX_CHAPTER_TITLE = 40;
export const MAX_SUGGESTIONS = 20;
const suggested = new Map(); // session id → Map task id → title: the suggestions still pending, oldest first

/** Forget the suggestions (tests). */
export function resetSuggestions() { suggested.clear(); }
/**
 * A suggestion the user started, dismissed or had done in the session leaves its pending list (electron/task-proposals.cjs),
 * as 2.42304.0 popBackgroundTaskSuggestionById takes it out of the queue. Returns whether it was pending.
 */
export function settleSuggestion(sessionId, taskId) { return suggested.get(sessionId)?.delete(taskId) ?? false; }

const oneLine = (value, max) => (typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "");
// 2.42304.0 index.chunk-B5tintml.js yb, with index.chunk-BhBOA_v0.js a (drop control, format and default-ignorable
// characters and lone surrogates) and s (quote-like characters → '): a title as the pending / evicted lists quote it,
// so a title can't fake a task_id or close the quotes.
const UNSEEN = /[\p{Cc}\p{Cf}\uD800-\uDFFF]|\p{Default_Ignorable_Code_Point}/gu;
const QUOTE_LIKE = /[<>"\p{Pi}\p{Pf}\u02BA\u02C2\u02C3\u02DD\u02EE\u05F4\u1433\u1438\u2033\u2036\u226A\u226B\u2329\u232A\u27E8\u27E9\u3003\u3008-\u300B\u301D-\u301F\uFE64\uFE65\uFF02\uFF1C\uFF1E]/gu;
export function quotedTitle(title) {
  return title.replace(/[\r\n\v\f\u0085\u2028\u2029]+/g, " \u23ce ").replace(UNSEEN, "").replace(QUOTE_LIKE, "'").replace(/`/g, "'")
    .replace(/session_id/gi, "session id").replace(/task_id/gi, "task id").slice(0, 120);
}
// Fx: `task_x "Title", task_y`.
const listed = (entries) => entries.map(([id, title]) => `${id}${title ? ` "${quotedTitle(title)}"` : ""}`).join(", ");

export const tools = [
  {
    name: "mark_chapter",
    mainOnly: true, // a sub-agent's call is refused (agent-tools-host.cjs)
    title: "Mark chapter",
    description: "Mark the start of a new chapter in this session: the user sees a heading in the transcript and can jump between chapters. Call it when the work shifts to a meaningfully different phase (exploration done and implementation starting, a fix landed and verification begins, the user changed topic). Use it sparingly: a chapter covers a coherent stretch of work, typically 3-8 per session, and not the very first message. The title is a short noun phrase under 40 characters (\"Auth bug fix\", \"Test verification\").",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: `Short noun-phrase title (under ${MAX_CHAPTER_TITLE} characters).` },
        summary: { type: "string", description: "Optional one-line summary of what the chapter covers." },
      },
      required: ["title"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
    handler: async (args = {}) => {
      const title = oneLine(args.title, 200);
      if (!title) throw new Error("title is required.");
      if (title.length > MAX_CHAPTER_TITLE) throw new Error(`Keep the chapter title under ${MAX_CHAPTER_TITLE} characters.`);
      return `Chapter “${title}” marked.`;
    },
  },
  {
    name: "spawn_task",
    title: "Suggest a task",
    // Ex / Nx (2.42304.0 index.chunk-B5tintml.js).
    description: "Flag an out-of-scope issue for a separate background task.\n\nCall this when you notice something worth fixing that would bloat the current change — dead code, stale docs, missing coverage, a confirmed TODO, or a security issue spotted in passing. Don't flag vague code-smell observations, trivial fixes you can do inline, or low-confidence hunches. A chip appears for the user; one click spins it off into its own session. Your current turn continues uninterrupted.\n\nThe prompt must stand alone — include file paths and enough context to act without this conversation.\n\nThe result includes a task_id; call dismiss_task with it if the suggestion later becomes stale.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Under 60 chars. Imperative action phrase (start with a verb), e.g. \"Fix stale README badge\", \"Remove dead config option\". Shown as the chip label and the spawned session title." },
        tldr: { type: "string", description: "One or two plain-English sentences shown on the suggestion card under the title. Lead with why you are suggesting this now — name what you noticed in this session — then say what the new session will do. Keep it readable: no file paths or code." },
        prompt: { type: "string", description: "The initial message for the spawned session. Self-contained — include file paths and enough context to act without this conversation. Not shown directly in the UI." },
        cwd: { type: "string", description: "Optional. Absolute path to a different project root than the current session's — a path on the host this session runs on. The spawned session gets a fresh worktree under this path. Defaults to the current project — only set this when the work clearly belongs in another repo on that host." },
      },
      required: ["title", "tldr", "prompt"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
    handler: async (args = {}, ctx) => {
      const title = oneLine(args.title, 200), tldr = oneLine(args.tldr, 600);
      const prompt = typeof args.prompt === "string" ? args.prompt.trim() : "";
      if (!title) throw new Error("title is required.");
      if (title.length > 60) throw new Error("Keep the title under 60 characters.");
      if (!tldr) throw new Error("tldr is required.");
      if (!prompt) throw new Error("prompt is required.");
      if (prompt.length > 20000) throw new Error("The prompt is too long (20,000 characters at most).");
      if (args.cwd !== undefined && args.cwd !== null && args.cwd !== "") {
        if (typeof args.cwd !== "string" || !path.isAbsolute(args.cwd) || args.cwd.includes("\0")) throw new Error("cwd must be an absolute folder path.");
        let directory = false;
        try { directory = fs.statSync(args.cwd).isDirectory(); } catch { directory = false; }
        if (!directory) throw new Error(`The folder ${args.cwd} doesn’t exist.`);
      }
      const open = suggested.get(ctx?.sessionId) ?? new Map();
      const id = `task_${crypto.randomBytes(4).toString("hex")}`;
      open.set(id, title);
      suggested.set(ctx?.sessionId, open);
      // Db: past MAX_SUGGESTIONS the oldest pending suggestions leave the queue; the new one never does.
      const evicted = [];
      for (const [key, value] of open) {
        if (open.size <= MAX_SUGGESTIONS || key === id) break;
        evicted.push([key, value]);
        open.delete(key);
      }
      const one = evicted.length === 1;
      const left = evicted.length > 0 ? `The queue holds at most ${MAX_SUGGESTIONS} pending suggestions, so the oldest ${one ? "one" : evicted.length} left the queue to make room and ${one ? "is" : "are"} no longer shown as ${one ? "a chip" : "chips"}: ${listed(evicted)}. ` : "";
      return `Noted (position ${open.size}, task_id: ${id}). A chip is showing for the user — they can start it in a fresh worktree with one click, or dismiss it. If this suggestion becomes stale or superseded, call dismiss_task with this task_id. `
        + left + `Currently pending: ${listed([...open])}. Continue your current work.`;
    },
  },
  {
    name: "dismiss_task",
    title: "Dismiss suggested task",
    description: "Withdraw a task you suggested with spawn_task in this session, e.g. because it was fixed here after all or a better-scoped suggestion replaces it. Only works for suggestions the user hasn't started.",
    inputSchema: {
      type: "object",
      properties: { task_id: { type: "string", description: "The task_id spawn_task returned." } },
      required: ["task_id"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
    handler: async (args = {}, ctx) => {
      const id = typeof args.task_id === "string" ? args.task_id.trim() : "";
      if (!/^task_[0-9a-f]{8}$/.test(id)) throw new Error("task_id must be one spawn_task returned (task_ followed by 8 hex digits).");
      const open = suggested.get(ctx?.sessionId);
      // A suggestion from before the app restarted isn't in memory any more: the transcript still withdraws it.
      open?.delete(id);
      return `Suggested task ${id} withdrawn.`;
    },
  },
];
