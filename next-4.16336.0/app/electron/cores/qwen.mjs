// Qwen Code (https://github.com/QwenLM/qwen-code). Adapter: harness/packages/acp-bridge, over `qwen --acp`
// (Agent Client Protocol over stdio). Release: the official npm package (a self-contained Node bundle, no
// dependencies), kept as a folder and run with Node. Data only (Extension Pack manifest).
export default Object.freeze({
  id: "qwen",
  // How the UI names the assistant while this core runs ("Message Qwen", "Qwen needs your approval").
  assistant: "Qwen",
  // Logo key (src/brand-logos.mjs) and the one plain sentence setup shows under the name.
  brand: "qwen",
  tagline: "Alibaba’s coding agent, made for Qwen models.",
  name: "Qwen Code",
  vendor: "Alibaba Cloud",
  engine: "qwen",
  kind: "bridge",
  available: true,
  models: "Qwen models (Bailian / Model Studio / Coding Plan) and any OpenAI-, Anthropic- or Gemini-compatible API",
  homepage: "https://github.com/QwenLM/qwen-code",
  // The Bypass dialog's "security guide" link (Qwen Code's approval modes (YOLO is its Bypass)).
  securityUrl: "https://github.com/QwenLM/qwen-code/blob/main/docs/users/features/approval-mode.md",
  license: "Apache-2.0",
  // The adapter script, relative to the repository root (packaged: process.resourcesPath).
  bridge: Object.freeze({ script: "harness/packages/acp-bridge/bin/app-server.mjs" }),
  // Thread.cliVersion the bridge reports: "qwen <version>".
  sessionPrefix: "qwen ",
  // Its own dynamic-workflow tool (named by the ultracode reminders on its own engine).
  workflowTool: Object.freeze({ name: "workflow" }),
  // The ACP bridge reports these in initialize too (acp-bridge server.js capabilities()); its Seatbelt profile keeps
  // network open (the agent must reach its model API), so sandboxNetwork is "always".
  implies: Object.freeze({
    // Claude Code tools the agent has itself: ask_user_question, cron_create/cron_list/cron_delete, monitor, report_findings, notebook_edit and web_fetch.
    nativeTools: Object.freeze(["AskUserQuestion", "CronCreate", "Monitor", "ReportFindings", "NotebookEdit", "WebFetch"]),
    generatesTitles: true, customization: true, permissionHints: true, systemPromptPreview: true, deleteHistory: true, unloadOnNavigate: true,
    structuredOutput: false, sideQuestion: true, sandboxNetwork: "always",
    // Qwen Code's own dynamic workflows (its workflow tool) run /workflow; the bridge projects them (qwen-workflow.js).
    modelWorkflows: true,
  }),
  // Qwen's saved workflows (core agents/runtime/workflow-saved.ts: <project>/.qwen/workflows, ~/.qwen/workflows; its
  // workflow-creator skill writes there): OpenClaude Desktop's workflow engine reads them too and saves there first.
  workflowFolders: Object.freeze([".qwen/workflows"]),
  configFile: "~/.qwen/settings.json",
  // Settings › Storage (settings-pages.cjs sessionStore): a session is <home>/projects/<project>/chats/<id>.jsonl
  // (chatRecordingService.ts, Storage.getProjectDir).
  sessionStore: Object.freeze({ files: Object.freeze(["projects/*/chats/<id>.jsonl"]) }),
  skillRoots: Object.freeze(["<project>/.qwen/skills", "<project>/.agents/skills", "~/.qwen/skills", "~/.agents/skills"]),
  // Sign-in: an API key for one of Qwen Code's own providers (acp-bridge account/login/start type apiKey →
  // qwen/providers/connect, what Qwen's /auth runs; template '<provider>[:<region>]'), written to ~/.qwen/settings.json.
  // Every provider of Qwen Code 0.24.7's /auth (core/src/providers/all-providers.ts) with each of its regions
  // (presets/*.ts baseUrl ids), so an international or Hong Kong key reaches its own endpoint. Its custom
  // OpenAI-compatible provider needs a base URL and models, which Settings › Models › Custom providers does not
  // serve on this core; sign-out (signOutRemovesKeys) removes the keys OpenClaude Desktop saved in ~/.qwen/settings.json.
  login: Object.freeze({
    browser: Object.freeze([]),
    apiKey: Object.freeze([
      Object.freeze({ template: "coding-plan:aliyun", label: "Alibaba Cloud Coding Plan key (China)", keyUrl: "https://help.aliyun.com/zh/model-studio/coding-plan" }),
      Object.freeze({ template: "coding-plan:alibabacloud", label: "Alibaba Cloud Coding Plan key (International)", keyUrl: "https://www.alibabacloud.com/help/en/model-studio/coding-plan" }),
      Object.freeze({ template: "token-plan:cn-beijing", label: "Alibaba Cloud Token Plan key (China)", keyUrl: "https://bailian.console.aliyun.com/" }),
      Object.freeze({ template: "token-plan:ap-southeast-1", label: "Alibaba Cloud Token Plan key (International)", keyUrl: "https://modelstudio.console.alibabacloud.com/" }),
      Object.freeze({ template: "alibabaStandard:cn-beijing", label: "Alibaba Cloud Model Studio key (China)", keyUrl: "https://bailian.console.aliyun.com/" }),
      Object.freeze({ template: "alibabaStandard:sg-singapore", label: "Alibaba Cloud Model Studio key (Singapore)", keyUrl: "https://modelstudio.console.alibabacloud.com/" }),
      Object.freeze({ template: "alibabaStandard:us-virginia", label: "Alibaba Cloud Model Studio key (US)", keyUrl: "https://modelstudio.console.alibabacloud.com/" }),
      Object.freeze({ template: "alibabaStandard:cn-hongkong", label: "Alibaba Cloud Model Studio key (Hong Kong)", keyUrl: "https://modelstudio.console.alibabacloud.com/" }),
      Object.freeze({ template: "openrouter", label: "OpenRouter API key", keyUrl: "https://openrouter.ai/keys" }),
      Object.freeze({ template: "requesty", label: "Requesty API key", keyUrl: "https://app.requesty.ai/api-keys" }),
      Object.freeze({ template: "deepseek", label: "DeepSeek API key", keyUrl: "https://platform.deepseek.com/api_keys" }),
      Object.freeze({ template: "moonshot:international", label: "Kimi (Moonshot AI) API key", keyUrl: "https://platform.kimi.ai/console/api-keys" }),
      Object.freeze({ template: "moonshot:china", label: "Kimi (Moonshot AI) API key (China)", keyUrl: "https://platform.moonshot.cn/console/api-keys" }),
      Object.freeze({ template: "zai:standard-api-key", label: "Z.AI API key", keyUrl: "https://z.ai/manage-apikey/apikey-list" }),
      Object.freeze({ template: "zai:coding-plan", label: "Z.AI GLM Coding Plan key", keyUrl: "https://z.ai/manage-apikey/apikey-list" }),
      Object.freeze({ template: "minimax:international", label: "MiniMax API key", keyUrl: "https://platform.minimax.io/user-center/basic-information/interface-key" }),
      Object.freeze({ template: "minimax:china", label: "MiniMax API key (China)", keyUrl: "https://platform.minimaxi.com/user-center/basic-information/interface-key" }),
      Object.freeze({ template: "grok", label: "Grok (xAI) API key", keyUrl: "https://console.x.ai/" }),
      Object.freeze({ template: "modelscope", label: "ModelScope API key", keyUrl: "https://modelscope.cn/my/myaccesstoken" }),
    ]),
    signOutRemovesKeys: true,
  }),
  agent: Object.freeze({
    binary: "qwen",
    systemPaths: Object.freeze(["/opt/homebrew/bin/qwen", "/usr/local/bin/qwen", "~/.npm-global/bin/qwen", "~/.local/bin/qwen"]),
    release: Object.freeze({
      version: "0.24.7",
      tag: "v0.24.7",
      type: "tgz",
      // npm dist.integrity sha512-NE+Ps9juMJS7DaHEVENIAJWCrzTiO/2bNq2TidmxmFc0ZbSMVKCfX3tlu2RY+CoP8xHFfUcy3MfQDQNszBJpJQ==
      url: "https://registry.npmjs.org/@qwen-code/qwen-code/-/qwen-code-{version}.tgz",
      assets: Object.freeze({
        arm64: Object.freeze({ name: "qwen-code-0.24.7.tgz", size: 31240308, sha256: "64430248ab6e996fc0c6b9a0789361f868c3b97f83d16210e0424e51dffc5fa9", keep: "dir", binaryPath: "package/cli-entry.js", runner: "node" }),
        x64: Object.freeze({ name: "qwen-code-0.24.7.tgz", size: 31240308, sha256: "64430248ab6e996fc0c6b9a0789361f868c3b97f83d16210e0424e51dffc5fa9", keep: "dir", binaryPath: "package/cli-entry.js", runner: "node" }),
      }),
    }),
  }),
});
