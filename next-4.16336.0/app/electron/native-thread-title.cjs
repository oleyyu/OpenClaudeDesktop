"use strict";
// Automatic session titles on a core that speaks only the upstream Codex protocol (Codex). The Codex TUI names an
// unnamed thread once its first user message completes (tui/src/app/thread_routing.rs → generate_thread_title): a
// hidden, ephemeral, read-only thread with most features off (temporary_structured_request.rs start_temporary_thread)
// runs one structured turn (outputSchema {title}, at most 36 characters) on gpt-5.6-luna for a ChatGPT account whose
// catalog lists it, else the session's model, and the result is saved with thread/name/set unless the user named the
// thread meanwhile (thread_title.rs). Here the renderer asks with codeDesktop/threadTitle {threadId, text, model?}
// after it set the first-message name, and saves the answer itself while that name is still the session's.
// observe() keeps every event of a title thread in main, so it never shows up as a session.

const THREAD_TITLE_MAX_CHARS = 36;
const THREAD_TITLE_MODEL = "gpt-5.6-luna";
const THREAD_TITLE_PROMPT_MAX_BYTES = 960;
const TIMEOUT_MS = 30000;

// thread_title.rs thread_title_instructions.
const INSTRUCTIONS = `Generate a concise, single-line task title of at most ${THREAD_TITLE_MAX_CHARS} characters and under five words where possible. Start with an imperative verb. Capitalize only the first word unless the user's language, proper nouns, acronyms, or code terms require otherwise. Preserve ticket references exactly. Write in the user's language. Do not use quotes, markdown, or trailing punctuation. Do not answer the request.`;

const OUTPUT_SCHEMA = Object.freeze({
  type: "object",
  properties: { title: { type: "string", minLength: 1, maxLength: THREAD_TITLE_MAX_CHARS } },
  required: ["title"],
  additionalProperties: false,
});

// temporary_structured_request.rs: the hidden thread runs with every tool and side feature off.
const FEATURES_OFF = Object.freeze({
  "features.apps": false, "features.code_mode": false, "features.code_mode_only": false, "features.context_management": false,
  "features.current_time_reminder": false, "features.deferred_executor": false, "features.enable_fanout": false, "features.goals": false,
  "features.hooks": false, "features.image_generation": false, "features.memories": false, "features.multi_agent": false,
  "features.multi_agent_v2": false, "features.plugins": false, "features.request_permissions_tool": false, "features.shell_snapshot": false,
  "features.shell_tool": false, "features.standalone_web_search": false, "features.token_budget": false, "features.tool_suggest": false,
  "features.unified_exec": false, "features.view_image": false, "orchestrator.skills.enabled": false, "skills.include_instructions": false,
  "tools.experimental_request_user_input.enabled": false, "tools.update_plan.enabled": false,
  web_search: "disabled",
});

/** thread_title.rs thread_title_prompt: the instructions and the user's prompt, bounded to 960 bytes (whole characters). */
function threadTitlePrompt(userMessage) {
  const prefix = `${INSTRUCTIONS}\n\nUser prompt:\n`;
  let budget = THREAD_TITLE_PROMPT_MAX_BYTES - Buffer.byteLength(prefix);
  let message = "";
  for (const character of String(userMessage ?? "").trim()) {
    const size = Buffer.byteLength(character);
    if (size > budget) break;
    budget -= size;
    message += character;
  }
  return `${prefix}${message}`;
}

/** thread_title.rs parse_thread_title: the JSON answer's title, unquoted, one line, no trailing .?!, at most 36 characters. */
function parseThreadTitle(response) {
  if (typeof response !== "string" || !response.trimStart().startsWith("{")) return null;
  let parsed;
  try { parsed = JSON.parse(response); } catch { return null; }
  if (!parsed || typeof parsed.title !== "string" || Object.keys(parsed).some((key) => key !== "title")) return null;
  const normalized = parsed.title.trim().replace(/^["'`“”‘’]+|["'`“”‘’]+$/g, "").split(/\s+/).filter(Boolean).join(" ").replace(/[.?!]+$/, "").trimEnd();
  if (!normalized) return null;
  return Array.from(normalized).slice(0, THREAD_TITLE_MAX_CHARS).join("").trimEnd() || null;
}

/** The model the title turn runs on: gpt-5.6-luna for a ChatGPT account whose catalog lists it, else the session's. */
function titleModel({ chatgpt = false, models = [], model = null } = {}) {
  if (chatgpt && Array.isArray(models) && models.some((entry) => (entry?.model ?? entry?.id) === THREAD_TITLE_MODEL)) return THREAD_TITLE_MODEL;
  return typeof model === "string" && model ? model : null;
}

/**
 * temporary_structured_request.rs: config overrides (`mcp_servers.<name>.enabled = false`, one dotted key per server:
 * a whole `mcp_servers` table replaces the configured one and fails thread/start with "invalid transport", checked
 * against codex 0.155.1) turning off every server the effective config for `cwd` names, and
 * `extra` (OpenClaude Desktop's own code_desktop, which a launch flag adds); null when config/read fails (fail closed). A name
 * the core doesn't define is never added (a session override naming an unknown server fails thread/start).
 */
async function mcpServersOff(owner, cwd, extra = []) {
  let configured;
  try { configured = await owner.request("config/read", { includeLayers: false, ...(cwd ? { cwd } : {}) }, 10000); }
  catch { return null; }
  if (!configured || typeof configured !== "object" || !configured.config || typeof configured.config !== "object") return null;
  const listed = configured.config.mcp_servers;
  const names = new Set(extra);
  if (listed && typeof listed === "object" && !Array.isArray(listed)) for (const name of Object.keys(listed)) names.add(name);
  // Codex's server names are [A-Za-z0-9_-]; one that can't be named in a dotted key can't be turned off: no title.
  if ([...names].some((name) => !/^[A-Za-z0-9_-]{1,128}$/.test(name))) return null;
  return Object.fromEntries([...names].sort().map((name) => [`mcp_servers.${name}.enabled`, false]));
}

/**
 * @param {{getClient: () => any, context?: () => {chatgpt?: boolean, models?: object[], model?: string|null},
 *   ownServers?: (owner: any) => string[]}} options
 *   ownServers: MCP servers the app itself gave the core (main.cjs: code_desktop, when Codex was launched with it),
 *   turned off as well even if config/read leaves them out.
 */
function createNativeThreadTitles({ getClient, context = () => ({}), ownServers = () => [] }) {
  const pending = new Map(); // title thread id → {owner, turnId, text, settle}
  const starting = new Set(); // owners with a thread/start in flight (its thread/started can come first)

  function finish(threadId, outcome) {
    const entry = pending.get(threadId);
    if (!entry) return;
    pending.delete(threadId);
    clearTimeout(entry.timer);
    if (entry.owner === getClient()) void Promise.resolve().then(() => entry.owner.request("thread/unsubscribe", { threadId })).catch(() => {});
    entry.settle({ ...outcome, text: entry.text });
  }

  /** codeDesktop/threadTitle {text, cwd?, model?} → {title: string|null}; never throws for a model that won't answer. */
  async function generate(params) {
    const owner = getClient();
    // Only what the user typed names the session, never the app's hidden <system-reminder> blocks.
    const text = typeof params?.text === "string" ? params.text.replace(/<system-reminder>[\s\S]*?(?:<\/system-reminder>|$)/g, "").trim() : "";
    if (!owner || !text) return { title: null };
    const settings = context() || {};
    const model = titleModel({ chatgpt: settings.chatgpt, models: settings.models, model: typeof params?.model === "string" && params.model ? params.model : settings.model });
    const cwd = typeof params?.cwd === "string" && params.cwd ? params.cwd : null;
    // The prompt is the user's first message (a pasted log, page or issue): untrusted text. As the TUI does, every MCP
    // server the effective config names (OpenClaude Desktop's own included) is turned off for the hidden thread, and no
    // environment, capability root or workspace root is given to it; a config that can't be read means no title.
    let extra = [];
    try { extra = (ownServers(owner) ?? []).filter((name) => typeof name === "string" && name); } catch { extra = []; }
    const servers = await mcpServersOff(owner, cwd, extra);
    if (!servers) return { title: null };
    let threadId;
    starting.add(owner);
    try {
      const response = await owner.request("thread/start", {
        ...(model ? { model } : {}),
        ...(cwd ? { cwd } : {}),
        approvalPolicy: "never", sandbox: "read-only", ephemeral: true,
        dynamicTools: [], environments: [], selectedCapabilityRoots: [], runtimeWorkspaceRoots: [],
        config: { ...FEATURES_OFF, ...servers },
      });
      threadId = response?.thread?.id;
    } catch { return { title: null }; }
    finally { starting.delete(owner); }
    if (typeof threadId !== "string" || !threadId) return { title: null };
    const answer = await new Promise((resolve) => {
      const entry = { owner, turnId: null, text: null, settle: resolve, timer: setTimeout(() => finish(threadId, { error: true }), TIMEOUT_MS) };
      entry.timer.unref?.();
      pending.set(threadId, entry);
      owner.request("turn/start", {
        threadId, input: [{ type: "text", text: threadTitlePrompt(text), text_elements: [] }], outputSchema: OUTPUT_SCHEMA,
        ...(model === THREAD_TITLE_MODEL ? { effort: "low" } : {}),
      }).then((result) => {
        if (typeof result?.turn?.id === "string") entry.turnId = result.turn.id;
        if (result?.turn?.status && result.turn.status !== "inProgress") finish(threadId, result.turn.status === "completed" ? {} : { error: true });
      }, () => finish(threadId, { error: true }));
    });
    return { title: answer?.error ? null : parseThreadTitle(answer?.text ?? null) };
  }

  /** Every core event: true when it belongs to a title thread (the renderer never sees those). */
  function observe(event) {
    if (event?.kind === "connection" && !event.connected) {
      for (const threadId of [...pending.keys()]) finish(threadId, { error: true });
      return false;
    }
    const params = event?.params || {};
    // A title thread's thread/started can arrive before thread/start answers: an ephemeral thread while one is starting.
    if (event?.method === "thread/started" && params.thread?.ephemeral === true && starting.size > 0 && !params.thread?.forkedFromId) return true;
    const threadId = params.threadId ?? params.thread?.id;
    const entry = typeof threadId === "string" ? pending.get(threadId) : null;
    if (!entry) return false;
    const turnId = params.turnId ?? params.turn?.id;
    if (event.method === "item/completed" && params.item?.type === "agentMessage" && typeof params.item.text === "string" && (!entry.turnId || !turnId || turnId === entry.turnId)) {
      if (Buffer.byteLength(params.item.text) <= 8 * 1024) entry.text = params.item.text;
    }
    if (event.method === "turn/completed" && (!entry.turnId || !turnId || turnId === entry.turnId))
      finish(threadId, params.turn?.status === "completed" ? {} : { error: true });
    return true;
  }

  return { generate, observe, isTitleThread: (id) => pending.has(id) };
}

module.exports = { createNativeThreadTitles, mcpServersOff, threadTitlePrompt, parseThreadTitle, titleModel, THREAD_TITLE_MODEL, THREAD_TITLE_MAX_CHARS };
