// Claude Desktop's ccd_session_mgmt tools that only read the app's sessions, or name the calling one (2.2553.1
// index.chunk-uZRTWaFR.js): list_sessions, get_session, list_events and set_session_title. Archiving, deleting, stopping and
// messaging another session stay with the user. Every core gets them: none has the app's session list.
// ctx.sessions: { list() → [{id, title, folder, archived, updatedAt, running}], get(id) → that | null, rename(title),
//               turns(id) → the session's turns as the core's thread/read includeTurns returns them }
//               (main.cjs; rename acts on the calling session only)
// list_events (Claude Desktop's ccd_session_mgmt list_events: session_id, limit 40, before_uuid) reads another session's
// recent transcript, so a session the user @-mentions in the composer (src/mention-model.mjs sessionMentionsBlock) can
// be read.
export const group = "sessions";
export const MAX_TITLE = 120;

const when = (seconds) => (Number.isFinite(seconds) && seconds > 0 ? new Date(seconds * 1000).toISOString() : null);
const shape = (session, self) => ({
  session_id: session.id,
  title: session.title || "(untitled)",
  ...(session.folder ? { folder: session.folder } : {}),
  status: session.archived ? "archived" : session.running ? "running" : "idle",
  ...(when(session.updatedAt) ? { updated_at: when(session.updatedAt) } : {}),
  ...(session.id === self ? { current: true } : {}),
});
function service(ctx) {
  if (!ctx?.sessions || typeof ctx.sessions.list !== "function") throw new Error("The session list isn’t available here.");
  return ctx.sessions;
}

export const EVENTS_LIMIT = 40;
const EVENT_TEXT_MAX = 2000;
const clipText = (text, max = EVENT_TEXT_MAX) => { const value = String(text ?? "").trim(); return value.length > max ? `${value.slice(0, max)}\u2026` : value; };
/** One transcript message per item: {id, role: 'User'|'Assistant'|'Tool', text}; items without anything to show are skipped. */
export function sessionEventMessages(turns = []) {
  const out = [];
  for (const turn of Array.isArray(turns) ? turns : []) for (const item of Array.isArray(turn?.items) ? turn.items : []) {
    const id = typeof item?.id === "string" && item.id ? item.id : null;
    if (!id) continue;
    let role = null, text = "";
    if (item.type === "userMessage") {
      role = "User";
      text = (Array.isArray(item.content) ? item.content : []).map((part) => part?.type === "text" ? part.text : part?.type === "image" || part?.type === "localImage" ? "[image]" : part?.type === "mention" ? `@${part.path ?? part.name ?? ""}` : part?.type === "skill" ? `/${part.name ?? ""}` : "").filter(Boolean).join("\n");
    } else if (item.type === "agentMessage") { role = "Assistant"; text = item.text; }
    else if (item.type === "commandExecution") { role = "Tool"; text = `Ran \`${clipText(item.command, 300)}\`${Number.isInteger(item.exitCode) ? ` (exit ${item.exitCode})` : ""}`; }
    else if (item.type === "fileChange") { role = "Tool"; text = `Edited ${(Array.isArray(item.changes) ? item.changes : []).map((change) => change?.path).filter(Boolean).join(", ") || "files"}`; }
    else if (item.type === "mcpToolCall") { role = "Tool"; text = `Called ${[item.server, item.tool].filter(Boolean).join(".")}`; }
    else if (item.type === "dynamicToolCall") { role = "Tool"; text = `Called ${item.tool ?? "a tool"}`; }
    else if (item.type === "webSearch") { role = "Tool"; text = `Searched the web${item.query ? ` for “${clipText(item.query, 200)}”` : ""}`; }
    else if (item.type === "collabAgentToolCall") { role = "Tool"; text = `Ran an agent${item.prompt ? `: ${clipText(item.prompt, 200)}` : ""}`; }
    if (!role) continue;
    text = clipText(text);
    if (text) out.push({ id, role, text });
  }
  return out;
}
/** list_events' compact plaintext: the last `limit` messages before `before` (an id it printed), most recent last. */
export function renderSessionEvents(turns, { limit = EVENTS_LIMIT, before = null } = {}) {
  let messages = sessionEventMessages(turns);
  if (before) {
    const at = messages.findIndex((message) => message.id === before);
    if (at < 0) throw new Error(`No message ${before} in that session.`);
    messages = messages.slice(0, at);
  }
  const count = Number.isFinite(limit) ? Math.min(200, Math.max(1, Math.trunc(limit))) : EVENTS_LIMIT;
  const shown = messages.slice(-count);
  if (!shown.length) return before ? "No earlier messages." : "This session has no messages yet.";
  const lines = shown.map((message) => `[${message.id}] ${message.role}: ${message.text}`);
  if (messages.length > shown.length) lines.unshift(`(${messages.length - shown.length} earlier messages; pass before_uuid "${shown[0].id}" to read them)`);
  return lines.join("\n\n");
}

export const tools = [
  {
    name: "list_sessions",
    title: "List sessions",
    description: "List the user's OpenClaude Desktop sessions, most recently active first: session_id, title, working folder, and whether each is running, idle or archived (yours is marked current). Read-only. Use it to find a related session the user mentions; never act on another session without the user asking.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Only sessions whose title or folder contains this text (case-insensitive)." },
        include_archived: { type: "boolean", description: "Include archived sessions. Default false." },
        limit: { type: "integer", minimum: 1, maximum: 100, description: "At most this many (default 25)." },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
    handler: async (args = {}, ctx) => {
      const query = typeof args.query === "string" ? args.query.trim().toLowerCase() : "";
      const limit = Number.isInteger(args.limit) ? Math.min(100, Math.max(1, args.limit)) : 25;
      const list = service(ctx).list()
        .filter((session) => args.include_archived === true || !session.archived)
        .filter((session) => !query || `${session.title ?? ""} ${session.folder ?? ""}`.toLowerCase().includes(query))
        .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
      if (!list.length) return query ? `No sessions match “${args.query}”.` : "No sessions.";
      const shown = list.slice(0, limit).map((session) => shape(session, ctx.sessionId));
      return JSON.stringify({ sessions: shown, ...(list.length > limit ? { more: list.length - limit } : {}) }, null, 2);
    },
  },
  {
    name: "get_session",
    title: "Get session",
    description: "Read one OpenClaude Desktop session's details by its session_id (from list_sessions): title, working folder, status and when it was last active. Read-only; without session_id, this session.",
    inputSchema: {
      type: "object",
      properties: { session_id: { type: "string", description: "The session to read. Default: this session." } },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
    handler: async (args = {}, ctx) => {
      const id = typeof args.session_id === "string" && args.session_id.trim() ? args.session_id.trim() : ctx.sessionId;
      const session = service(ctx).get(id);
      if (!session) throw new Error(`No session ${id}.`);
      return JSON.stringify(shape(session, ctx.sessionId), null, 2);
    },
  },
  {
    name: "list_events",
    title: "Read session",
    description: "Read the recent transcript of another OpenClaude Desktop session: a compact plaintext rendering of its user and assistant messages and tool calls, most recent last. Use it to understand what another session has been doing or what it concluded — for example one the user @-mentioned. Read-only.",
    inputSchema: {
      type: "object",
      properties: {
        session_id: { type: "string", description: "The session whose transcript to read (from list_sessions or an @-mention). Must not be this session." },
        limit: { type: "number", description: `Most recent messages to include. Default ${EVENTS_LIMIT}.` },
        before_uuid: { type: "string", description: "Only messages before this point: pass the id a previous call printed, to page back through a long transcript." },
      },
      required: ["session_id"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
    handler: async (args = {}, ctx) => {
      const id = typeof args.session_id === "string" ? args.session_id.trim() : "";
      if (!id) throw new Error("session_id is required.");
      if (id === ctx.sessionId) throw new Error("That is this session: its transcript is already yours.");
      const sessions = service(ctx);
      if (!sessions.get(id)) throw new Error(`No session ${id}.`);
      if (typeof sessions.turns !== "function") throw new Error("Session transcripts aren’t available here.");
      const turns = await sessions.turns(id);
      return renderSessionEvents(turns, { limit: args.limit ?? EVENTS_LIMIT, before: typeof args.before_uuid === "string" && args.before_uuid.trim() ? args.before_uuid.trim() : null });
    },
  },
  {
    name: "set_session_title",
    mainOnly: true, // a sub-agent's call is refused (agent-tools-host.cjs)
    title: "Rename session",
    description: "Set this session's title, as it shows in the sidebar and the window title. Use a short, specific title (a few words) when the conversation's topic is clear and the current title doesn't describe it; don't rename a session the user named themselves unless they ask.",
    inputSchema: {
      type: "object",
      properties: { title: { type: "string", description: `The new title (at most ${MAX_TITLE} characters).` } },
      required: ["title"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    handler: async (args = {}, ctx) => {
      const title = typeof args.title === "string" ? args.title.replace(/\s+/g, " ").trim() : "";
      if (!title) throw new Error("title is required.");
      if (title.length > MAX_TITLE) throw new Error(`Keep the title under ${MAX_TITLE} characters.`);
      const sessions = service(ctx);
      const before = typeof sessions.get === "function" ? sessions.get(ctx.sessionId) : null;
      const previous = typeof before?.title === "string" ? before.title.trim() : "";
      await sessions.rename(title);
      // W14-code r2 R2T-TS7: 3.6556.2's tool answers with the rename record in the result's _meta (c52b02f3f
      // `Dt = "ccdSessionRenamed"`; Mt reads `resultMcpMeta._meta[Dt]` {sessionId, isSelf, title, previousTitle,
      // previousTitleSource}, only while `input.title.trim() === title.trim()`), which cb6930dae bc draws under the tool
      // row as From / To with "Undo rename". The text the model reads stays the same.
      return { content: [{ type: "text", text: `Session renamed to “${title}”.` }],
        _meta: { ccdSessionRenamed: { sessionId: ctx.sessionId, isSelf: true, title, ...(previous && previous !== title ? { previousTitle: previous } : {}) } } };
    },
  },
];
