// w13-chatfn-memory: "Search and reference chats" (research/w13-chatfn.md M1, M4). The official Chat's server-side tools
// conversation_search and recent_chats (12 and 11 mentions in 3.6556.2: cd0f209bd `pe = new Set(["recent_chats",
// "conversation_search"])`, c283a58a1 `var y="recent_chats"`) let Claude find and quote the user's earlier chats; the
// setting "Search and reference chats" (c6bba3086 Sn) turns them off. Here they read the local history index
// (chat-history-search.mjs) through ctx.pastChats (main.cjs → chat-memory.mjs pastChats):
//   { enabled() → boolean, search(query, {n}) → rows, recent({n, sortOrder, before, after}) → rows }
// Scope as the official tools: a chat in a project sees that project's chats; any other chat sees chats outside
// projects. The calling chat itself, incognito chats, Code sessions and Cowork tasks are never returned. Read-only.
export const group = 'past-chats';
export const surfaces = ['chat'];

export const SEARCH_DEFAULT = 5, SEARCH_MAX = 10;
export const RECENT_DEFAULT = 3, RECENT_MAX = 20;

function service(ctx) {
  const pastChats = ctx?.pastChats;
  if (!pastChats || typeof pastChats.search !== 'function') throw new Error('Past chats aren’t available here.');
  if (typeof pastChats.enabled === 'function' && !pastChats.enabled()) throw new Error('Searching past chats is turned off in Settings › Memory.');
  return pastChats;
}
const when = seconds => Number.isFinite(seconds) && seconds > 0 ? new Date(seconds * 1000).toISOString() : null;
const count = (value, fallback, max) => Number.isInteger(value) ? Math.min(max, Math.max(1, value)) : fallback;
const chat = row => ({ session_id: row.id, title: row.title || '(untitled)', ...(when(row.updatedAt) ? { updated_at: when(row.updatedAt) } : {}),
  ...(row.snippet ? { snippet: row.snippet } : {}), ...(Array.isArray(row.messages) ? { messages: row.messages } : {}) });
const datetime = value => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = typeof value === 'string' ? Date.parse(value) : NaN;
  if (!Number.isFinite(parsed)) throw new Error(`“${value}” isn’t a date and time (use ISO 8601, e.g. 2026-10-01T00:00:00Z).`);
  return Math.floor(parsed / 1000);
};

export const tools = [
  {
    name: 'conversation_search',
    title: 'Search past chats',
    description: 'Search the user’s past chats in OpenClaude Desktop by topic or keywords and get the matching chats with a snippet of the relevant part. Use it when the user refers to something discussed before (“as we talked about”, “that recipe you gave me”) or asks what they told you earlier. Inside a project it searches that project’s chats only. Read-only; cite what you use by the chat’s title.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Keywords or a short phrase naming the topic to find (not a whole question).' },
        max_results: { type: 'integer', minimum: 1, maximum: SEARCH_MAX, description: `At most this many chats (default ${SEARCH_DEFAULT}).` },
      },
      required: ['query'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
    handler: async (args = {}, ctx) => {
      const pastChats = service(ctx);
      const query = typeof args.query === 'string' ? args.query.trim() : '';
      if (!query) throw new Error('Give a query to search past chats.');
      const rows = await pastChats.search(query, { n: count(args.max_results, SEARCH_DEFAULT, SEARCH_MAX) });
      if (!rows.length) return `No past chats match “${query}”.`;
      return JSON.stringify({ chats: rows.map(chat) }, null, 2);
    },
  },
  {
    name: 'recent_chats',
    title: 'Recent chats',
    description: 'List the user’s most recent past chats in OpenClaude Desktop with their last messages, optionally within a time window. Use it when the user asks about recent conversations (“what did we talk about yesterday?”). Inside a project it lists that project’s chats only. Read-only.',
    inputSchema: {
      type: 'object',
      properties: {
        n: { type: 'integer', minimum: 1, maximum: RECENT_MAX, description: `How many chats (default ${RECENT_DEFAULT}).` },
        sort_order: { type: 'string', enum: ['desc', 'asc'], description: 'desc (newest first, the default) or asc.' },
        before: { type: 'string', description: 'Only chats last active before this ISO 8601 date and time.' },
        after: { type: 'string', description: 'Only chats last active after this ISO 8601 date and time.' },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
    handler: async (args = {}, ctx) => {
      const pastChats = service(ctx);
      const rows = await pastChats.recent({ n: count(args.n, RECENT_DEFAULT, RECENT_MAX), sortOrder: args.sort_order === 'asc' ? 'asc' : 'desc',
        before: datetime(args.before), after: datetime(args.after) });
      if (!rows.length) return 'No past chats in that range.';
      return JSON.stringify({ chats: rows.map(chat) }, null, 2);
    },
  },
];
