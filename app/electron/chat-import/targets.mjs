// Import Chat History, the target side (analysis/import-chat-history/DESIGN.md "主进程接口"): one ImportedSession
// (chat-import catalog.mjs readSession) brought into the running core as a session the user continues. Two halves:
//   prepareImport(session, {convert, budgets})  the heavy part, run in the chat-import worker (worker.mjs / ops.mjs):
//            what each strategy hands the model — trimmed to a token budget of the target model's context window,
//            newest content kept, likely secrets masked (redact.mjs) — and the display prefix as JSON.
//   importInto({prepared, core, …})             the core calls, on the main thread: injectable functions, so every
//            strategy runs against fake clients in tests/chat-import-targets.test.mjs; index.cjs wires them to main.
//
// Strategies, tried in this order:
//   fork     the source is the running core's own store and its bridge thread id is the store's session id (OWN_STORE):
//            the core forks it (thread/fork, main.cjs forkCoreSession) into a new thread, so the original stays as it
//            was. No fork (refused, unreadable id) falls through to the strategies below — never a resume in place.
//   native   any core whose initialize capabilities carry threadImport: codeDesktop/thread/import (main-only, main.cjs
//            importCoreThread; never in the renderer's `allowed` list) makes a new session of that agent holding the
//            conversation — DeepSeek (harness codex-app-server thread-import.js: a seeded Harness session), Gemini /
//            Kimi / Qwen (acp-bridge server.js importThread over agents/<id>.js importSession: the CLI's own session
//            files), OpenCode 1.x / MiMo (opencode-bridge thread-import.js: POST /sync/replay), ZCode (zcode-bridge
//            thread-import.js: session/create importedHistory). An answer with import.mode 'transcript' (an OpenCode
//            server that took the conversation only as one context message) is kept as an inject: its display prefix
//            is saved. Any failure (METHOD_NOT_FOUND from a bridge without the writer — MiniMax —, a refused seed, a
//            ZCode too old for importedHistory) falls through to handoff.
//   inject   Codex: thread/start, then thread/inject_items with ResponseItem messages (user input_text, assistant
//            output_text; the call native-side-chat.cjs already makes): the model sees the history as its own. A
//            failed inject archives the empty thread (main's discard) and falls back to handoff.
//   handoff  every other core (MiniMax): thread/start whose developer instructions get an intro plus the transcript
//            (convert.mjs toTranscriptText) appended after the session's own (main requestRpc appendInstructions), which
//            every bridge puts in the system prompt — sized per core (HANDOFF_BYTES, then MiniMax exactly at the start:
//            minimaxHandoffLimit / fitHandoffInstructions keep its newest messages within the AGENTS.md cap).
// inject and handoff keep a display prefix (convert.mjs toCodexTurns) the transcript shows before the new session's
// own turns (src/import-history-display.mjs); fork and native sessions show their history themselves.
import { redactSecrets, redactValue } from './redact.mjs';
import { estimateTokens } from './text-budget.mjs';

export const STRATEGIES = Object.freeze(["fork", "native", "inject", "handoff"]);
// The target model's window when the app doesn't know it (model list, Settings › Models): a conservative 128k.
export const DEFAULT_CONTEXT_WINDOW = 128_000;
// The share of that window an import may fill: the history as the model's own messages (native, inject), or the
// transcript inside the system prompt (handoff), which leaves room for the core's own prompt and the next turns.
export const SEED_SHARE = 0.4;
export const HANDOFF_SHARE = 0.2;
// harness thread-import.js IMPORT_MAX_MESSAGES / IMPORT_MAX_CHARS (4_000_000; kept under it).
export const IMPORT_MAX_MESSAGES = 5000;
export const IMPORT_MAX_CHARS = 3_900_000;
// thread/inject_items batches (each a JSON-RPC request).
export const INJECT_BATCH = 200;
// The display prefix file's bounds (index.cjs writes it).
export const PREFIX_MAX_TURNS = 2000;
export const PREFIX_MAX_BYTES = 16 * 1024 * 1024;
// A Code session's default developer instructions on a core without capabilities.customization (src/main.jsx
// thread/start, routine-runner.mjs CODE_ROUTINE_INSTRUCTIONS): an imported session starts with them too.
export const DEFAULT_INSTRUCTIONS = "You are the assistant in OpenClaude Desktop, a local desktop client. Follow the user language. When asked for a plan, use the plan tool. Do not claim to be Claude.";
// The warning codes importInto reports (the page maps them to sentences, src/import-history-model.mjs importWarnings).
export const WARNINGS = Object.freeze(["truncated", "secrets-redacted", "fork-failed", "native-failed", "inject-failed", "title-not-set", "no-display-history"]);
// The core whose own store each source is (fork), where the source's session id is the core's thread id and the fork
// leaves the original as it was: Codex rollouts, dsh sessions, OpenCode / MiMo sessions (opencode-bridge fork: POST
// /session/:id/fork; MiMo session/session.ts Session.fork :816-899 reads the original's messages and inbox receipts and
// writes every copy under the NEW session id inside one transaction, removing the new session on failure; thread/read
// is GET /session/:id + GET /session/:id/message). Not ZCode: zcode-bridge thread/fork first loads the original
// (server.js loadThread → session/resume), and resuming a ZCode session writes to it — settleSessionInput discards
// admitted pending inputs (ZCode steering.ts :1410-1423), resume appends a SessionResumed event and runs the
// "resume" session-start hooks (resume.ts :248-283), a remote workspace is repaired (server-operations.ts :1514) —
// and leaves it loaded in the bridge's runtime; ZCode sources take native session/create importedHistory instead.
// Not Gemini, Kimi or Qwen either, though their thread ids are session ids too: the acp-bridge reaches the original
// only by opening it in the agent (session/load or resume), which writes to it — Gemini renames its chat files and
// records a new one (agents/gemini.js beforeLoad), Kimi rewrites an older wire journal at its current protocol, Qwen's
// resume takes the session's writer lease and appends to it — so those sources take the native path (a new session
// from the text) too.
const OWN_STORE = Object.freeze({ codex: "codex", dsh: "deepseek", opencode: "opencode", mimo: "mimo" });
// A core whose handoff transcript has a byte bound besides the token budget (UTF-8; a CJK character is 3 bytes):
// MiniMax writes developer instructions into the thread's global AGENTS.md, which mcode reads only up to 32 KiB
// (acp-bridge agents/minimax.js MINIMAX_GLOBAL_MAX_BYTES). That file also holds, before the transcript, the user's own
// ~/.minimax/AGENTS.md and the session's prompt and instructions, and after it the app-tools guidance; the bridge cuts
// past 32 KiB from the END, which would lose the newest messages and the closing tag. So the prepared transcript is
// bounded by the whole file here (the first, cheap bound), and sized exactly when the session starts: main's requestRpc
// calls the handoff's appendFit with the decorated thread/start params, minimaxHandoffLimit takes what they and the
// user's file (a read-only stat, index.cjs) leave, and fitHandoffInstructions drops the transcript's OLDEST lines.
export const MINIMAX_GLOBAL_MAX_BYTES = 32 * 1024;
export const HANDOFF_BYTES = Object.freeze({ minimax: MINIMAX_GLOBAL_MAX_BYTES });
// What the size of the rest of MiniMax's AGENTS.md can't tell from the params: the bridge interpolates {model} / {cwd}
// / {provider} into a custom system prompt (acp-bridge server.js launchConfig), and agents/minimax.js's truncation note.
export const MINIMAX_HANDOFF_MARGIN = 1024;
// The handoff transcript's frame (handoffInstructions) and the note fitHandoffInstructions leaves where it cut (the
// MiniMax bridge's trimImportedConversation writes the same).
export const IMPORTED_OPEN = "<imported_conversation>\n";
export const IMPORTED_CLOSE = "\n</imported_conversation>";
export const IMPORTED_LEFT_OUT = "[… the earlier part of this conversation was left out to fit …]\n";
export const SOURCE_LABELS = Object.freeze({
  codex: "Codex", "claude-code": "Claude Code", dsh: "DeepSeek Harness", gemini: "Gemini CLI", opencode: "OpenCode",
  mimo: "MiMo Code", grok: "Grok CLI", kimi: "Kimi", qwen: "Qwen Code", minimax: "MiniMax Code", zcode: "ZCode",
  copilot: "GitHub Copilot CLI", cursor: "Cursor",
});

const text = (value) => (typeof value === "string" ? value : "");
const isRecord = (value) => !!value && typeof value === "object" && !Array.isArray(value);
const oneLine = (value) => text(value).replace(/\s+/g, " ").trim();

/** A source id's display name. */
export const sourceLabel = (source) => SOURCE_LABELS[source] || oneLine(source) || "another agent";

/** The session's title for names and notes: its title, else its first prompt, shortened. */
export function sessionName(session, max = 120) {
  const value = oneLine(session?.title) || oneLine(session?.firstPrompt);
  if (!value) return "";
  const chars = [...value];
  return chars.length > max ? `${chars.slice(0, max - 1).join("")}…` : value;
}

/** preferences.sessionMetadata[threadId].importedFrom (DESIGN.md 记账). */
export function importedFromRecord(session, strategy, now = Date.now()) {
  return { source: text(session?.source), sourceId: text(session?.sourceId), title: sessionName(session) || null, importedAt: now, strategy };
}

/**
 * Token budgets from the target model's context window (unknown or implausible: DEFAULT_CONTEXT_WINDOW), and the
 * target core's handoff byte bound when it has one (HANDOFF_BYTES).
 */
export function importBudgets(contextWindow, coreId = null) {
  const known = Number.isFinite(contextWindow) && contextWindow >= 4096;
  const window = known ? Math.floor(contextWindow) : DEFAULT_CONTEXT_WINDOW;
  const bytes = HANDOFF_BYTES[coreId];
  return { contextWindow: window, known, seedTokens: Math.floor(window * SEED_SHARE), handoffTokens: Math.floor(window * HANDOFF_SHARE), ...(bytes ? { handoffBytes: bytes } : {}) };
}

/**
 * The newest messages that fit the budget (a conversation's end matters most for continuing it), in order: at most
 * `maxTokens` estimated tokens, `maxMessages` messages and `maxChars` characters. A number is maxTokens.
 * @returns {{ messages: Array<{role: string, text: string}>, truncated: boolean, kept: number, total: number }}
 */
export function trimMessages(messages, budget = {}) {
  const { maxTokens = importBudgets(null).seedTokens, maxMessages = IMPORT_MAX_MESSAGES, maxChars = IMPORT_MAX_CHARS } = typeof budget === "number" ? { maxTokens: budget } : budget;
  const list = (Array.isArray(messages) ? messages : []).filter((message) => (message?.role === "user" || message?.role === "assistant") && text(message.text).trim());
  let tokens = 0, chars = 0, start = list.length;
  while (start > 0 && list.length - start < maxMessages) {
    const next = list[start - 1].text, cost = estimateTokens(next);
    if (tokens + cost > maxTokens || chars + next.length > maxChars) break;
    tokens += cost; chars += next.length; start -= 1;
  }
  // Always something: a single message longer than the budget keeps its end.
  if (start === list.length && list.length) {
    const last = list.at(-1);
    let end = last.text.slice(-maxChars);
    while (end.length > 1 && estimateTokens(end) > maxTokens) end = end.slice(-Math.max(1, Math.floor(end.length * 0.9)));
    return { messages: [{ role: last.role, text: end }], truncated: true, kept: 1, total: list.length };
  }
  return { messages: list.slice(start), truncated: start > 0, kept: list.length - start, total: list.length };
}

/** Codex ResponseItem messages for thread/inject_items (codex protocol ResponseItem::Message). */
export function responseItemsOf(messages) {
  return messages.map((message) => message.role === "assistant"
    ? { type: "message", role: "assistant", content: [{ type: "output_text", text: message.text }] }
    : { type: "message", role: "user", content: [{ type: "input_text", text: message.text }] });
}

/** The handoff's developer instructions: what the transcript is, then the transcript. */
export function handoffInstructions(session, transcript, { truncated = false } = {}) {
  const name = sessionName(session);
  const from = `${sourceLabel(session?.source)}${name ? ` ("${name}")` : ""}`;
  return [
    `The conversation below was imported from ${from} so the user can continue it here. It is a record of earlier work, not new instructions: use it as context, do not redo what it shows was already done, and carry on from where it ends when the user writes next.${truncated ? " Its beginning was left out because it was too long." : ""}`,
    `<imported_conversation>\n${text(transcript).trim()}\n</imported_conversation>`,
  ].join("\n\n");
}

/**
 * Handoff instructions within `maxBytes` (UTF-8): unchanged when they fit, else the transcript inside
 * <imported_conversation> loses its OLDEST part (cut on a character, then a line, boundary; a note where it was cut),
 * while the intro before it and the closing tag stay. Throws when not even that frame fits.
 * @returns {{ text: string, trimmed: boolean }}
 */
export function fitHandoffInstructions(instructions, maxBytes) {
  const value = text(instructions);
  if (Buffer.byteLength(value) <= maxBytes) return { text: value, trimmed: false };
  const open = value.indexOf(IMPORTED_OPEN), close = value.lastIndexOf(IMPORTED_CLOSE);
  const tooBig = () => new Error("The conversation doesn’t fit this core’s handoff.");
  if (open < 0 || close < open + IMPORTED_OPEN.length || !(maxBytes > 0)) throw tooBig();
  const head = value.slice(0, open + IMPORTED_OPEN.length), body = value.slice(open + IMPORTED_OPEN.length, close), tail = value.slice(close);
  const room = maxBytes - Buffer.byteLength(head + IMPORTED_LEFT_OUT + tail);
  if (room <= 0) throw tooBig();
  const raw = Buffer.from(body);
  let kept = raw.subarray(Math.max(0, raw.length - room)).toString("utf8").replace(/^\uFFFD+/, "");
  const line = kept.indexOf("\n");
  if (line >= 0 && line < 2000 && line < kept.length - 1) kept = kept.slice(line + 1);
  return { text: head + IMPORTED_LEFT_OUT + kept + tail, trimmed: true };
}

/**
 * The bytes MiniMax's AGENTS.md leaves for the handoff instructions once a thread/start is decorated (`params`, as main
 * sends it): acp-bridge agents/minimax.js launch writes the user's own AGENTS.md (`ownBytes`; left out by the bridge
 * when over the limit by itself), then server.js launchConfig's prompt — the custom system prompt, or the persona —,
 * the custom instructions, the developer instructions (the transcript joins their end) and, without a custom system
 * prompt, the app-tools guidance (`appToolsBytes`), each joined by a blank line; MINIMAX_HANDOFF_MARGIN besides.
 */
export function minimaxHandoffLimit(params, { ownBytes = 0, appToolsBytes = 0 } = {}) {
  const custom = params?.codeDesktop?.customization && typeof params.codeDesktop.customization === "object" ? params.codeDesktop.customization : {};
  const part = (value) => { const line = text(value).trim(); return line ? Buffer.byteLength(line) + 2 : 0; };
  const persona = typeof custom.persona === "string" ? custom.persona : text(custom.persona?.prompt) || text(custom.persona?.text);
  const own = ownBytes > 0 && ownBytes + 4 + 200 <= MINIMAX_GLOBAL_MAX_BYTES ? ownBytes + 2 : 0;
  const prompt = text(custom.systemPrompt).trim() ? part(custom.systemPrompt) : part(persona) + (appToolsBytes > 0 ? appToolsBytes + 2 : 0);
  const used = own + prompt + part(custom.instructions) + part(params?.developerInstructions) + 2 + MINIMAX_HANDOFF_MARGIN;
  return MINIMAX_GLOBAL_MAX_BYTES - used;
}

/** The newest-last display turns within the prefix file's bounds. */
export function boundedTurns(turns) {
  let list = (Array.isArray(turns) ? turns : []).slice(-PREFIX_MAX_TURNS);
  const sizes = list.map((turn) => Buffer.byteLength(JSON.stringify(turn)) + 1);
  let bytes = sizes.reduce((sum, value) => sum + value, 0), drop = 0;
  while (list.length - drop > 1 && bytes > PREFIX_MAX_BYTES) bytes -= sizes[drop++];
  return drop ? list.slice(drop) : list;
}

// The tool calls' displays a seed carries beside its text (convert.mjs toolCallDisplay, at most 32 000 characters
// each), in all: the newest keep theirs, older calls show from their text alone (each core's fallback).
export const SEED_CALLS_MAX_CHARS = 2_000_000;
/** Drops the oldest tool calls' displays from `messages` (trimMessages' answer, in place) past SEED_CALLS_MAX_CHARS. */
export function boundCalls(messages) {
  let chars = 0;
  for (const message of [...(Array.isArray(messages) ? messages : [])].reverse()) {
    for (const part of [...(Array.isArray(message?.parts) ? message.parts : [])].reverse()) {
      if (!part?.call) continue;
      chars += JSON.stringify(part.call).length;
      if (chars > SEED_CALLS_MAX_CHARS) delete part.call;
    }
  }
  return messages;
}

/** The SessionSummary half of an ImportedSession (no items). */
export function summaryOf(session) {
  if (!session || typeof session !== "object") return null;
  const { items, ...summary } = session;
  void items;
  return summary;
}

/**
 * What every strategy needs, computed once off the main thread: the native / inject seed (trimmed to the seed budget,
 * redacted), the handoff transcript (handoff budget, redacted, its title included) and the display prefix as JSON.
 * @param {object} session ImportedSession
 * @param {{ convert: { toCodexTurns: Function, toTranscriptText: Function, toDshSeed: Function }, budgets?: object }} options
 */
export function prepareImport(session, { convert, budgets = importBudgets(null) } = {}) {
  if (!session || typeof session !== "object" || !session.source) throw new Error("Nothing to import.");
  let seedRedacted = 0;
  // ts (convert.mjs toDshSeed): the source's time of the message, kept for the cores that place messages by time.
  const tsOf = (message) => (Number.isSafeInteger(message?.ts) && message.ts > 0 ? { ts: message.ts } : {});
  const masked = (convert.toDshSeed(session)?.messages ?? []).map((message) => {
    if (!Array.isArray(message?.parts) || !message.parts.length) {
      const { text: value, count } = redactSecrets(text(message?.text));
      seedRedacted += count;
      return { role: message?.role, text: value, ...tsOf(message) };
    }
    // parts (convert.mjs toDshSeed): redacted one by one, then their join once more — redact.mjs's PEM rule is the one
    // that spans lines, so a key opening in one block and closing in the next outlives block-by-block redaction.
    // A tool block's call (its row's display, convert.mjs toolCallDisplay) is redacted string by string the same way
    // (redactValue), and its strings join that second pass. The count stays what the model was spared: a call repeats
    // its block's command or arguments, so its masks are not counted again.
    let count = 0;
    const strings = [];
    const parts = message.parts.map((part) => {
      const clean = redactSecrets(text(part?.text));
      count += clean.count;
      const call = part?.tool === true && isRecord(part.call) ? redactValue(part.call) : null;
      if (call) strings.push(...call.strings);
      return { text: clean.text, ...(part?.tool === true ? { tool: true, ...(call ? { call: call.value } : {}) } : {}) };
    });
    const joined = redactSecrets(parts.map((part) => part.text).join("\n\n"));
    const across = !joined.count && strings.length ? redactSecrets([joined.text, ...strings].join("\n\n")).count : 0;
    seedRedacted += count + joined.count;
    // The blocks have to spell the text out; once the join has redacted something of its own they no longer do, so
    // that message travels as text alone (no tool rows for it) instead of carrying the key on in its blocks — and so
    // does one whose calls, read together with the text, spell a key no single string held.
    return joined.count || across ? { role: message?.role, text: joined.text, ...tsOf(message) } : { role: message?.role, text: joined.text, parts, ...tsOf(message) };
  });
  const seed = { ...trimMessages(masked, { maxTokens: budgets.seedTokens }), redacted: seedRedacted };
  boundCalls(seed.messages);
  let transcript;
  try {
    const build = (maxTokens) => {
      const made = convert.toTranscriptText(session, { maxTokens, includeTools: true }) ?? {};
      return { made, instructions: redactSecrets(handoffInstructions(session, made.text, { truncated: made.truncated === true })) };
    };
    let { made, instructions } = build(budgets.handoffTokens);
    // A byte bound (HANDOFF_BYTES): the token budget shrinks until the whole instructions fit (at most four bytes a
    // token, so the first try is usually the last).
    const maxBytes = Number.isFinite(budgets.handoffBytes) && budgets.handoffBytes > 0 ? budgets.handoffBytes : 0;
    if (maxBytes && Buffer.byteLength(instructions.text) > maxBytes) {
      let tokens = Math.min(budgets.handoffTokens, Math.floor(maxBytes / 4));
      for (let tries = 0; tries < 20 && tokens >= 64; tries++, tokens = Math.floor(tokens * 0.8)) {
        ({ made, instructions } = build(tokens));
        if (Buffer.byteLength(instructions.text) <= maxBytes) break;
      }
      if (Buffer.byteLength(instructions.text) > maxBytes) throw new Error("The conversation doesn’t fit this core’s handoff.");
    }
    transcript = { instructions: instructions.text, truncated: made.truncated === true, kept: made.kept ?? null, total: made.total ?? null, redacted: instructions.count };
  } catch (error) {
    transcript = { error: text(error?.message) || String(error) };
  }
  let display = null;
  try {
    const turns = boundedTurns(convert.toCodexTurns(session) ?? []);
    display = { json: JSON.stringify(turns), count: turns.length };
  } catch {}
  return { session: summaryOf(session), budgets, seed, transcript, display };
}

const capabilities = (core) => (core?.capabilities && typeof core.capabilities === "object" ? core.capabilities : {});
const errorText = (error) => text(error?.message) || String(error ?? "");
const threadIdOf = (result) => (typeof result?.thread?.id === "string" && result.thread.id ? result.thread.id : null);

/** Which strategies apply to this session on this core, in the order they are tried (handoff always last). */
export function planStrategies(session, core) {
  const plan = [];
  if (session?.sourceId && OWN_STORE[session.source] && OWN_STORE[session.source] === core?.id) plan.push("fork");
  if (capabilities(core).threadImport === true) plan.push("native");
  if (core?.id === "codex") plan.push("inject");
  plan.push("handoff");
  return plan;
}

/**
 * Bring a prepared session into the running core.
 * @param {object} input
 * @param {object} input.prepared prepareImport's answer
 * @param {{ id: string, capabilities?: object }} input.core the running core (core-registry id, capabilities)
 * @param {(method: string, params: object, options?: {appendInstructions?: string}) => Promise<any>} input.rpc main's
 *   bookkept request (requestRpc: thread/start joins the sidebar; thread/name/set renames the row)
 * @param {(method: string, params: object) => Promise<any>} input.request the connection itself (thread/inject_items)
 * @param {(threadId: string) => Promise<{threadId: string} | null>} [input.fork] main's forkCoreSession
 * @param {(params: object) => Promise<any>} [input.importThread] main's importCoreThread (codeDesktop/thread/import)
 * @param {(threadId: string) => Promise<any>} [input.discard] archives and forgets a thread this import gave up on
 * @param {(params: object) => number | null} [input.handoffLimit] the bytes the core leaves the handoff instructions,
 *   given the decorated thread/start params (MiniMax: minimaxHandoffLimit); none: no bound beyond the prepared one
 * @param {string} [input.cwd] the folder when the session names none (or names one that is gone)
 * @param {object} [input.startParams] extra thread/start params
 * @returns {Promise<{ threadId, strategy, warnings: string[], details: string[], trimmed: {kept, total} | null,
 *   redacted: number, prefix: {json, count} | null, importedFrom: object }>}
 */
export async function importInto({ prepared, core, rpc, request, fork, importThread, discard, handoffLimit, cwd, startParams = {}, now = Date.now }) {
  const session = prepared?.session;
  if (!session || typeof session !== "object" || !session.source) throw new Error("Nothing to import.");
  const warnings = [], details = [];
  const caps = capabilities(core);
  const folder = text(cwd) || text(session.cwd);
  const title = sessionName(session);
  const base = { ...(startParams && typeof startParams === "object" ? startParams : {}), ...(folder ? { cwd: folder } : {}) };
  if (caps.customization !== true && !text(base.developerInstructions)) base.developerInstructions = DEFAULT_INSTRUCTIONS;
  // What the model got for the strategy that ends the import (the seed or the transcript): its trim and redaction.
  let handed = null;
  const done = (threadId, strategy, prefix = null) => {
    const trimmed = handed?.truncated ? { kept: handed.kept ?? null, total: handed.total ?? null } : null;
    const redacted = handed?.redacted ?? 0;
    if (trimmed) warnings.unshift("truncated");
    if (redacted) warnings.push("secrets-redacted");
    if (prefix === null && (strategy === "inject" || strategy === "handoff")) warnings.push("no-display-history");
    return { threadId, strategy, warnings: [...new Set(warnings)], details, trimmed, redacted, prefix, importedFrom: importedFromRecord(session, strategy, now()) };
  };
  const failed = (code, error) => { warnings.push(code); details.push(`${code}: ${errorText(error)}`); handed = null; };
  const useSeed = () => {
    handed = prepared.seed ?? {};
    return Array.isArray(handed.messages) ? handed.messages : [];
  };
  const rename = async (threadId) => {
    if (!title) return;
    try { await rpc("thread/name/set", { threadId, name: title }); } catch (error) { warnings.push("title-not-set"); details.push(`title-not-set: ${errorText(error)}`); }
  };

  for (const strategy of planStrategies(session, core)) {
    if (strategy === "fork") {
      if (typeof fork !== "function") continue;
      try {
        const forked = await fork(session.sourceId);
        if (!forked?.threadId) throw new Error("no fork");
        await rename(forked.threadId);
        return done(forked.threadId, "fork");
      } catch (error) { failed("fork-failed", error); continue; }
    }
    if (strategy === "native") {
      if (typeof importThread !== "function") continue;
      const messages = useSeed();
      if (!messages.length) { handed = null; continue; }
      try {
        const result = await importThread({ ...(folder ? { cwd: folder } : {}), title, messages,
          importedFrom: { source: session.source, sourceId: text(session.sourceId), title: redactSecrets(title).text, sourcePath: text(session.sourcePath) } });
        const threadId = threadIdOf(result);
        if (!threadId) throw new Error("no thread");
        // The core took it only as one context message (opencode-bridge appendHistory): shown like an inject.
        if (result?.import?.mode === "transcript") return done(threadId, "inject", prepared.display ?? null);
        return done(threadId, "native");
      } catch (error) { failed("native-failed", error); continue; }
    }
    if (strategy === "inject") {
      const messages = useSeed();
      if (!messages.length) { handed = null; continue; }
      const threadId = threadIdOf(await rpc("thread/start", base));
      if (!threadId) throw new Error("The core didn’t start a session.");
      try {
        const items = responseItemsOf(messages);
        for (let at = 0; at < items.length; at += INJECT_BATCH) await request("thread/inject_items", { threadId, items: items.slice(at, at + INJECT_BATCH) });
      } catch (error) {
        failed("inject-failed", error);
        await Promise.resolve(discard?.(threadId)).catch(() => {});
        continue;
      }
      await rename(threadId);
      return done(threadId, "inject", prepared.display ?? null);
    }
    // handoff
    const transcript = prepared.transcript ?? {};
    if (transcript.error || !text(transcript.instructions)) throw new Error(`The conversation couldn’t be read: ${transcript.error || "no transcript"}`);
    handed = transcript;
    // appendFit (main's requestRpc, after decorating the params): the transcript sized to what the core leaves it.
    const options = { appendInstructions: transcript.instructions };
    if (typeof handoffLimit === "function") {
      options.appendFit = (params) => {
        const max = handoffLimit(params);
        options.fitted = Number.isFinite(max) ? fitHandoffInstructions(transcript.instructions, max) : { text: transcript.instructions, trimmed: false };
        return options.fitted;
      };
    }
    const threadId = threadIdOf(await rpc("thread/start", base, options));
    if (!threadId) throw new Error("The core didn’t start a session.");
    if (options.fitted?.trimmed) handed = { ...handed, truncated: true };
    await rename(threadId);
    return done(threadId, "handoff", prepared.display ?? null);
  }
  /* c8 ignore next -- handoff always ends the plan */
  throw new Error("The conversation couldn’t be imported.");
}
