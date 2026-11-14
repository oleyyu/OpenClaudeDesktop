// Claude Desktop's ccd_window tools (2.31226.0 c2189a16b runLayoutCommand, served as get_window_layout,
// open_session_in, close_split and set_sidebar_collapsed): the agent reads the app's window layout and arranges where
// its own session shows. main.cjs asks the window holding the calling session (main.jsx applies
// src/layout-command-model.mjs there) and answers with the outcome and the layout.
// ctx.layout: { run({ kind, targetSessionId?, collapsed? }) → { outcome, reason?, paneIndex?, layout } }  (main.cjs)
//
// Claude Desktop lets the agent show "self" or a session it started with start_session. OpenClaude Desktop's agents
// start no sessions of their own, so the target is the calling session; any other session is the user's to arrange.
export const group = "window";

function service(ctx) {
  if (!ctx?.layout || typeof ctx.layout.run !== "function") throw new Error("The window layout isn’t available here.");
  return ctx.layout;
}
/** The session a call names: "self" (or the calling session's own id); another session is refused. */
export function targetSession(value, sessionId) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) throw new Error("session_id is required.");
  if (raw === "self" || raw === sessionId) return sessionId;
  throw new Error("You can only arrange this session (\"self\"). Ask the user to open other sessions from the sidebar: in the main window, drag it from the sidebar to where they want it, or right-click it and choose Open in → Split view.");
}
const text = (response) => JSON.stringify({ outcome: response?.outcome ?? "failed", ...(response?.reason ? { reason: response.reason } : {}),
  ...(Number.isInteger(response?.paneIndex) ? { paneIndex: response.paneIndex } : {}), ...(response?.layout ? { layout: response.layout } : {}) }, null, 2);

export const tools = [
  {
    name: "get_window_layout",
    title: "Get window layout",
    description: "Describe the app's window layout right now: the main window's split-view panes (session ids, which one is focused), sessions open in pop-out windows, whether the sidebar is collapsed, and where this session is showing, if anywhere. Read-only. Use it before rearranging, or to check whether the user can currently see this session.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, openWorldHint: false },
    handler: async (_args, ctx) => text(await service(ctx).run({ kind: "get-layout" })),
  },
  {
    name: "open_session_in",
    title: "Open session in",
    description: "Show this session somewhere else. Layout only: nothing is sent to the session, and it keeps running either way.\n\nsession_id must be this session (\"self\"); for any other session, ask the user to open it from the sidebar. For split view, tell them how: in the main window, drag it from the sidebar to where they want it, or right-click it and choose Open in → Split view.\n\ntarget:\n- \"split\": add it as a split-view pane in the window where this session is showing.\n- \"window\": open it in its own pop-out window (shown without taking keyboard focus).\n- \"focus\": show it in this window's main pane, like clicking its sidebar row. Refused while the user's cursor is in a text field or terminal.\n\nActs only while this session is on screen. If the user is looking at another session, it changes nothing and says so; don't retry, just say where to find the session. Already-visible targets are reported as no-ops. OS window focus is never changed.",
    inputSchema: {
      type: "object",
      properties: {
        session_id: { type: "string", description: "The session to show: \"self\"." },
        target: { type: "string", enum: ["split", "window", "focus"], description: "\"split\" | \"window\" | \"focus\". See the tool description." },
      },
      required: ["session_id", "target"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    handler: async (args = {}, ctx) => {
      const targetSessionId = targetSession(args.session_id, ctx.sessionId);
      const kind = { split: "open-in-split", window: "open-in-window", focus: "focus" }[args.target];
      if (!kind) throw new Error("target must be \"split\", \"window\" or \"focus\".");
      return text(await service(ctx).run({ kind, targetSessionId }));
    },
  },
  {
    name: "close_split",
    title: "Close split",
    description: "Close a split-view pane that you opened with open_session_in (target \"split\"), never a pane or window the user arranged. The session in it keeps running; only the pane goes away. session_id picks which of your panes to close; omit it to close the most recent one still open. Acts only while this session is on screen.",
    inputSchema: { type: "object", properties: { session_id: { type: "string", description: "The session whose pane to close (one you opened). Omit for the most recent." } }, additionalProperties: false },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    handler: async (args = {}, ctx) => {
      const targetSessionId = args.session_id === undefined ? undefined : targetSession(args.session_id, ctx.sessionId);
      return text(await service(ctx).run({ kind: "close-split", ...(targetSessionId ? { targetSessionId } : {}) }));
    },
  },
  {
    name: "set_sidebar_collapsed",
    title: "Collapse or expand the sidebar",
    description: "Collapse (true) or expand (false) the main window's sidebar, e.g. collapse it before showing something wide, and expand it again afterwards if you were the one who collapsed it. Acts only while this session is showing in the main window; already-in-that-state is reported as a no-op, and a window too narrow to show the sidebar can't be expanded.",
    inputSchema: { type: "object", properties: { collapsed: { type: "boolean", description: "true = collapse, false = expand." } }, required: ["collapsed"], additionalProperties: false },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    handler: async (args = {}, ctx) => {
      if (typeof args.collapsed !== "boolean") throw new Error("collapsed must be true or false.");
      return text(await service(ctx).run({ kind: "set-sidebar-collapsed", collapsed: args.collapsed }));
    },
  },
];
