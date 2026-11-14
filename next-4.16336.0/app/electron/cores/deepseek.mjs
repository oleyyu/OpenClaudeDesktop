// DeepSeek Harness: the bridge in harness/packages/codex-app-server around the dsh runtime (run with Node).
export default Object.freeze({
  id: "deepseek",
  // How the UI names the assistant while this core runs ("Stop DeepSeek’s response", "DeepSeek needs your approval").
  assistant: "DeepSeek",
  // Logo key (src/brand-logos.mjs) and the one plain sentence setup shows under the name.
  brand: "deepseek",
  tagline: "Fast and affordable. Also runs GLM, Kimi, Qwen and other models you add.",
  name: "DeepSeek Harness",
  vendor: "DeepSeek",
  engine: "deepseek-harness",
  kind: "builtin",
  // The public repository (vendor/deepseek-harness/README.md): /help's "{core} documentation" and Settings › Cores.
  homepage: "https://github.com/deepseek-ai/deepseek-harness",
  // "DeepSeek models": a product term the assistant-name rewrite keeps (i18n ASSISTANT_WORD), never "Codex models".
  models: "DeepSeek models, and any OpenAI- or Anthropic-compatible API added in Settings › Models",
  // Thread.cliVersion is "dsh <version>" (harness codex-app-server threadObject).
  sessionPrefix: "dsh ",
  // The Harness's own dynamic-workflow tool (named by the ultracode reminders on its own engine). OpenClaude Desktop's
  // profile renames it (harness/packages/code-desktop-app/cordis.patch.yml tool-workflow toolName: Workflow).
  workflowTool: Object.freeze({ name: "Workflow" }),
  // What the bridge supports without listing it in initialize (older bridges and UI fixtures report only the engine).
  // Its Seatbelt profile (codex-app-server sandbox-shell.js) confines writes only, so sandboxed commands always have
  // network; a bridge that honors sandboxPolicy.networkAccess reports sandboxNetwork "policy" instead.
  implies: Object.freeze({
    // Claude Code tools the agent has itself: ask_user_question (AskUserQuestion), present (SendUserFile) and web_fetch (WebFetch).
    nativeTools: Object.freeze(["AskUserQuestion", "SendUserFile", "WebFetch"]),
    generatesTitles: true, customization: true, permissionHints: true, systemPromptPreview: true, harnessProfile: true,
    providerSettings: true, deleteHistory: true, unloadOnNavigate: true, perTokenBilling: true, sideQuestion: true,
    sandboxNetwork: "always",
    // /workflow's launcher script runs on the Harness's own workflow engine (codeDesktop/workflow/startScript,
    // workflow-harness.mjs) instead of OpenClaude Desktop's runner (session-command-model workflowEngine).
    workflowScripts: true,
    // dsh-mcp-client sends every MCP tool with each model request (no tool search) and re-lists on tools/list_changed:
    // OpenClaude Desktop's long, rarely used tool groups wait behind code_desktop load_tools (main.cjs agentToolsDeferred).
    deferAppTools: true,
  }),
  // Where deleteHistory removes a session's own files (codex-app-server deleteSessionFiles), named in the delete confirms.
  historyLocation: "~/.dsh/sessions",
  configFile: null,
  skillRoots: Object.freeze(["<project>/.dsh/skills", "<project>/.agents/skills", "~/.dsh/skills", "~/.agents/skills"]),
});
