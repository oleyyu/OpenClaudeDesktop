"use strict";
// context-breakdown: the per-category context counts of the session rail's Context card (2.42304.0 c2d611398 H, the
// /context breakdown). The original asks Claude Code for `get_context_usage`; OpenClaude Desktop's cores do not answer
// that, so this service produces the counts the renderer turns into the same report (src/context-breakdown-model.mjs,
// with the thread's tokenUsage total, window and auto-compact threshold):
//
//   1. A core whose bridge measures its own requests (capabilities.contextUsage: the DeepSeek Harness bridge with its
//      token meter, the ZCode bridge from the proxy's last request) answers codeDesktop/contextUsage/read; its counts
//      are used as they are (source "core").
//   2. Every other core (Codex, the ACP cores Gemini / Kimi / Qwen / MiniMax, OpenCode / MiMo), or a bridge that has
//      nothing measured yet for the thread: the host estimates (ceil(characters / 4), source "host", `estimated`) only
//      what it can see itself —
//        System prompt   the core's own preview of the prompt it sends (codeDesktop/systemPrompt/preview), where it has one
//        MCP server instructions  the code_desktop server's own instructions (its initialize reply), on the cores the
//                        host knows put them in front of the model (every bridge: natively, or the bridge appends them;
//                        not Codex, which is not known to), as Claude Code 2.1.299 counts them: `## code_desktop\n<text>`;
//                        the user's MCP servers' instructions are not reported by mcpServerStatus/list: not counted
//        MCP tools       OpenClaude Desktop's code_desktop tools as this session's server lists them (exact definitions),
//                        plus the user's MCP servers' tools the core reports with input schemas (mcpServerStatus/list);
//                        the code_desktop groups still waiting behind load_tools are "MCP tools (deferred)"
//        Skills          the enabled skills' names and descriptions (skills/list), the catalog the model is shown
//        Memory files    the instruction files the core loads itself (instructions-service coreInstructionFiles) and the
//                        app's project instructions (.code-desktop/instructions.md, sent with every turn)
//      System tools are left out there: those cores report their built-in tools by name only, never their schemas.
// A category nobody can see is absent (never invented); every failure only drops that category.
const fs = require("node:fs");
const path = require("node:path");

const PREVIEW_TIMEOUT = 15000;
const LIST_TIMEOUT = 15000;
const CHARS_PER_TOKEN = 4;
const APP_SERVER = "code_desktop";

const estimateText = (text) => (typeof text === "string" && text ? Math.ceil(text.length / CHARS_PER_TOKEN) : 0);
const estimateJson = (value) => { try { return value === undefined ? 0 : Math.ceil(JSON.stringify(value).length / CHARS_PER_TOKEN); } catch { return 0; } };
const toolDefinition = (tool) => ({ name: tool.name, description: tool.description ?? "", input_schema: tool.inputSchema ?? tool.input_schema ?? { type: "object" } });
const record = (value) => value && typeof value === "object" && !Array.isArray(value);
const positive = (value) => Number.isFinite(value) && value > 0;

/** A bridge's counts, kept to the fields the report reads. */
function coreCounts(value) {
  const categories = {};
  for (const [key, entry] of Object.entries(record(value?.categories) ? value.categories : {}))
    if (positive(entry?.tokens)) categories[key] = { tokens: Math.round(entry.tokens) };
  const list = (items, keep) => (Array.isArray(items) ? items.filter(record).map(keep).filter(Boolean) : []);
  return {
    categories,
    memoryFiles: list(value?.memoryFiles, (f) => (typeof f.path === "string" && positive(f.tokens) ? { path: f.path, type: typeof f.type === "string" ? f.type : "Project", tokens: Math.round(f.tokens) } : null)),
    mcpTools: list(value?.mcpTools, (t) => (typeof t.name === "string" && typeof t.serverName === "string" && positive(t.tokens) ? { name: t.name, serverName: t.serverName, tokens: Math.round(t.tokens), isLoaded: t.isLoaded !== false } : null)),
    agents: list(value?.agents, (a) => (typeof a.agentType === "string" && positive(a.tokens) ? { agentType: a.agentType, source: typeof a.source === "string" ? a.source : "", tokens: Math.round(a.tokens) } : null)),
    measure: typeof value?.measure === "string" ? value.measure : null,
  };
}

/** mcpServerStatus/list servers: `tools` as a map (Codex) or a list (bridges). */
function serverTools(server) {
  const tools = server?.tools;
  if (Array.isArray(tools)) return tools.filter(record);
  if (record(tools)) return Object.entries(tools).map(([name, tool]) => ({ name, ...(record(tool) ? tool : {}) }));
  return [];
}
/** A schema worth pricing: one with properties or a type other than a bare object placeholder. */
const hasSchema = (tool) => {
  const schema = tool?.inputSchema ?? tool?.input_schema;
  return record(schema) && (record(schema.properties) ? Object.keys(schema.properties).length > 0 : Object.keys(schema).some((key) => key !== "type"));
};

function createContextUsageService({ getClient, getConfig, coreSupports, sessionToolLists, appServerInstructions = () => null, systemPromptText, instructionFiles, projectInstructions, readFile = (file) => fs.readFileSync(file, "utf8") }) {
  async function host({ client, threadId, cwd }) {
    const categories = {}, mcpTools = [], memoryFiles = [], sources = {};
    const add = (key, tokens) => { if (positive(tokens)) { categories[key] = { tokens: (categories[key]?.tokens ?? 0) + Math.round(tokens), estimated: true }; sources[key] = "host"; } };
    // The app's project instructions are a Memory files row; a preview that carries them has them taken out of its text.
    let project = null;
    try { project = await projectInstructions(cwd); } catch { project = null; }
    const projectText = typeof project?.text === "string" ? project.text.trim() : "";
    let serverText = "";
    try { serverText = String(appServerInstructions(client) ?? "").trim(); } catch { serverText = ""; }
    if (serverText) add("mcpServerInstructions", estimateText(`## ${APP_SERVER}\n${serverText}`));
    if (coreSupports(client.serverInfo, "systemPromptPreview")) {
      try {
        let text = await systemPromptText({ threadId, cwd });
        // a bridge that appends the server's instructions to its prompt: they are their own row, not System prompt
        for (const part of [projectText, serverText]) if (part && typeof text === "string") text = text.split(part).join("");
        add("systemPrompt", estimateText(text));
      } catch { /* no preview now: no row */ }
    }
    try {
      const lists = sessionToolLists?.(threadId);
      for (const tool of lists?.tools ?? []) {
        const tokens = estimateJson(toolDefinition(tool));
        add("mcpTools", tokens);
        mcpTools.push({ name: tool.name, serverName: APP_SERVER, tokens, isLoaded: true });
      }
      for (const tool of lists?.deferred ?? []) {
        const tokens = estimateJson(toolDefinition(tool));
        add("mcpToolsDeferred", tokens);
        mcpTools.push({ name: tool.name, serverName: APP_SERVER, tokens, isLoaded: false });
      }
    } catch { /* the app's tools server is not up */ }
    try {
      const listed = await client.request("mcpServerStatus/list", { detail: "toolsAndAuthOnly", ...(threadId ? { threadId } : {}) }, LIST_TIMEOUT);
      for (const server of Array.isArray(listed?.data) ? listed.data : []) {
        if (typeof server?.name !== "string" || server.name === APP_SERVER) continue;
        for (const tool of serverTools(server)) {
          if (typeof tool.name !== "string" || !hasSchema(tool)) continue;
          const tokens = estimateJson(toolDefinition(tool));
          add("mcpTools", tokens);
          mcpTools.push({ name: tool.name, serverName: server.name, tokens, isLoaded: true });
        }
      }
    } catch { /* no MCP listing: the user's servers are not counted */ }
    try {
      const listed = await client.request("skills/list", cwd ? { cwds: [cwd] } : {}, LIST_TIMEOUT);
      let tokens = 0;
      for (const entry of Array.isArray(listed?.data) ? listed.data : [])
        for (const skill of Array.isArray(entry?.skills) ? entry.skills : [])
          if (skill?.enabled !== false && typeof skill?.name === "string") tokens += estimateText(`- ${skill.name}: ${typeof skill.description === "string" ? skill.description : ""}\n`);
      add("skills", tokens);
    } catch { /* no skills listing */ }
    const files = [];
    try { for (const file of (await instructionFiles(cwd)) ?? []) if (file?.exists && typeof file.path === "string") files.push({ path: file.path, type: file.scope === "global" ? "User" : "Project" }); } catch {}
    for (const file of files) {
      let text = "";
      try { text = readFile(file.path); } catch { continue; }
      const tokens = estimateText(text);
      if (!positive(tokens)) continue;
      add("memoryFiles", tokens);
      memoryFiles.push({ ...file, tokens });
    }
    {
      const tokens = estimateText(projectText);
      if (positive(tokens)) { add("memoryFiles", tokens); memoryFiles.push({ path: typeof project.path === "string" ? project.path : ".code-desktop/instructions.md", type: "Project", tokens }); }
    }
    return { categories, memoryFiles, mcpTools, agents: [], measure: "host-estimate", sources };
  }

  /** { categories, memoryFiles, mcpTools, agents, measure, sources } for one session; null without a running core. */
  async function read({ threadId, cwd } = {}) {
    const client = getClient();
    if (!client?.serverInfo || typeof threadId !== "string" || !threadId) return null;
    const known = [...(getConfig()?.threadIds ?? []), ...(getConfig()?.archivedThreadIds ?? [])];
    if (!known.includes(threadId)) throw new Error("Unknown session.");
    const folder = typeof cwd === "string" && path.isAbsolute(cwd) ? cwd : getConfig()?.threadMetadata?.[threadId]?.cwd ?? getConfig()?.cwd ?? null;
    if (coreSupports(client.serverInfo, "contextUsage")) {
      try {
        const counts = coreCounts(await client.request("codeDesktop/contextUsage/read", { threadId }, LIST_TIMEOUT));
        if (Object.keys(counts.categories).length > 0)
          return { ...counts, sources: Object.fromEntries(Object.keys(counts.categories).map((key) => [key, "core"])) };
      } catch { /* the bridge could not measure: estimate instead */ }
    }
    return host({ client, threadId, cwd: folder });
  }
  return { read };
}

module.exports = { createContextUsageService, coreCounts, serverTools, hasSchema, estimateText, estimateJson };
