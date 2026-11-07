// MiMo Code (https://github.com/XiaomiMiMo/MiMo-Code). Adapter: harness/packages/opencode-bridge, over mimo serve (an OpenCode fork: the same HTTP API + SSE).
// Data only (an Extension Pack manifest carries the same object; work/agents/opencode-bridge/make-pack.mjs).
export default Object.freeze({
  id: "mimo",
  // How the UI names the assistant while this core runs ("Message MiMo", "MiMo needs your approval").
  assistant: "MiMo",
  // Logo key (src/brand-logos.mjs) and the one plain sentence setup shows under the name.
  brand: "mimo",
  tagline: "Xiaomi’s coding agent, made for MiMo models.",
  name: "MiMo Code",
  vendor: "Xiaomi",
  engine: "mimo",
  kind: "bridge",
  available: true,
  models: "Xiaomi MiMo models",
  homepage: "https://github.com/XiaomiMiMo/MiMo-Code",
  license: "MIT (with extra use terms)",
  // The adapter script, relative to the repository root (packaged: process.resourcesPath).
  bridge: Object.freeze({ script: "harness/packages/opencode-bridge/bin/app-server.mjs" }),
  // Thread.cliVersion the bridge reports: "mimo <version>".
  sessionPrefix: "mimo ",
  // Its own dynamic-workflow tool (named by the ultracode reminders on its own engine).
  workflowTool: Object.freeze({ name: "workflow" }),
  // The bridge reports these in initialize too (harness/packages/opencode-bridge/src/index.js capabilitiesFor).
  implies: Object.freeze({
    // Claude Code tools the agent has itself: question, the cron tools (MIMOCODE_EXPERIMENTAL_CRON is on by default), notebook edits and webfetch.
    nativeTools: Object.freeze(["AskUserQuestion", "CronCreate", "NotebookEdit", "WebFetch"]),
    generatesTitles: true, customization: true, permissionHints: true, systemPromptPreview: true, livePermissions: true, toolSelection: true,
    codeStats: true, structuredOutput: true, deleteHistory: true, unloadOnNavigate: true, perTokenBilling: true, modelWorkflows: true,
    skillToggle: true, mcpConfigWrite: true, pluginManage: true, sideQuestion: true, configOverlay: true,
    // Rewind can restore files through the agent's own undo (session/revert.ts); /cd is hidden because a session keeps
    // its folder; a connector's stored sign-in can be removed (DELETE /mcp/:name/auth).
    rewindFiles: true, forkCwd: false, mcpLogout: true,
    // The agent's own agents (Customize, the Mode menu's Agent group) and its settings under Settings › Code.
    agentsList: true, primaryAgents: true, coreSettings: true,
    // The bridge's Seatbelt profile (opencode-bridge sandbox.js) denies network unless sandboxPolicy.networkAccess allows it.
    sandboxNetwork: "policy",
    // No tool search; it re-lists on tools/list_changed: the long app tool groups wait behind load_tools.
    deferAppTools: true,
  }),
  // The agent's own data folder (sessions and auth.json under XDG_DATA_HOME), where deleteHistory removes a session.
  historyLocation: "~/.local/share/mimocode",
  // Settings › Storage (settings-pages.cjs sessionStore): every session is in the agent's own database in that folder.
  sessionStore: Object.freeze({ database: "~/.local/share/mimocode" }),
  // Settings › Customize › Plugins › Add plugin (customize-model pluginFormCopy): what MiMo Code's plugin list takes.
  plugins: Object.freeze({ format: "An npm package name or a file path to a plugin module.", placeholder: "package-name or /path/to/plugin.js" }),
  // The user's own config; OpenClaude Desktop's overlay lives in the bridge state folder (MIMOCODE_CONFIG_DIR).
  configFile: "~/.config/mimocode/mimocode.jsonc",
  skillRoots: Object.freeze(["<project>/.mimocode/skills", "~/.config/mimocode/skills", "<project>/.agents/skills", "~/.agents/skills"]),
  // Settings › Account: the agent's own sign-ins (account/login/start codeDesktop.provider / .template).
  login: Object.freeze({
    // MiMo's /connect also signs in to SuperGrok (xAI OAuth, browser or headless code), Poe and GitHub Copilot (a device
    // code on github.com; GitHub Enterprise needs its URL, which only MiMo's own /connect asks for).
    browser: Object.freeze([Object.freeze({ provider: "xiaomi", label: "Xiaomi MiMo account" }), Object.freeze({ provider: "openai", label: "ChatGPT Pro/Plus", deviceCode: true }),
      Object.freeze({ provider: "xai", label: "SuperGrok (xAI)", deviceCode: true }), Object.freeze({ provider: "poe", label: "Poe" })]),
    deviceCode: Object.freeze([Object.freeze({ type: "chatgptDeviceCode", provider: "github-copilot", label: "GitHub Copilot" })]),
    // Xiaomi bills two ways with separate keys that "cannot be mixed": pay-as-you-go sk-… keys (provider xiaomi,
    // api.xiaomimimo.com) and Token Plan tp-… keys, each plan on its region's gateway (xiaomi-token-plan-cn|ams|sgp,
    // token-plan-*.xiaomimimo.com; MiMo's provider/error.ts, its /connect list). keyPrefix: account-operations refuses
    // a key that starts with another option's prefix and names that option.
    apiKey: Object.freeze([
      Object.freeze({ template: "xiaomi", label: "Xiaomi MiMo API key", keyUrl: "https://platform.xiaomimimo.com/#/console/api-keys", keyPrefix: "sk-" }),
      Object.freeze({ template: "xiaomi-token-plan-cn", label: "Xiaomi MiMo Token Plan key (China)", keyUrl: "https://platform.xiaomimimo.com/#/console/plan-manage", keyPrefix: "tp-" }),
      Object.freeze({ template: "xiaomi-token-plan-ams", label: "Xiaomi MiMo Token Plan key (Europe)", keyUrl: "https://platform.xiaomimimo.com/#/console/plan-manage", keyPrefix: "tp-" }),
      Object.freeze({ template: "xiaomi-token-plan-sgp", label: "Xiaomi MiMo Token Plan key (Singapore)", keyUrl: "https://platform.xiaomimimo.com/#/console/plan-manage", keyPrefix: "tp-" }),
      Object.freeze({ template: "anthropic", label: "Anthropic API key", keyUrl: "https://console.anthropic.com/settings/keys", keyPrefix: "sk-ant-" }),
      Object.freeze({ template: "openrouter", label: "OpenRouter API key", keyUrl: "https://openrouter.ai/settings/keys", keyPrefix: "sk-or-" }),
      // The other providers OpenCode-based agents take keys for (as in opencode.mjs). Their keys also start with sk-, so they
      // carry it: Xiaomi's sk- prefix must not refuse them.
      Object.freeze({ template: "openai", label: "OpenAI API key", keyUrl: "https://platform.openai.com/api-keys", keyPrefix: "sk-" }),
      Object.freeze({ template: "deepseek", label: "DeepSeek API key", keyUrl: "https://platform.deepseek.com/api_keys", keyPrefix: "sk-" }),
      Object.freeze({ template: "moonshotai", label: "Moonshot (Kimi) API key", keyUrl: "https://platform.kimi.ai/console/api-keys", keyPrefix: "sk-" }),
      Object.freeze({ template: "zai-coding-plan", label: "Z.ai GLM Coding Plan key", keyUrl: "https://z.ai/manage-apikey/apikey-list" }),
      Object.freeze({ template: "minimax", label: "MiniMax API key", keyUrl: "https://platform.minimax.io/user-center/basic-information/interface-key", keyPrefix: "sk-" }),
      Object.freeze({ template: "xai", label: "xAI API key", keyUrl: "https://console.x.ai", keyPrefix: "xai-" }),
    ]),
    // The agent's auth store (opencode-bridge credentials.js): account/logout deletes every sign-in in it, saved API keys too.
    store: "~/.local/share/mimocode",
    signOutRemovesKeys: true,
  }),
  agent: Object.freeze({
    binary: "mimo",
    // A MiMo Code the user installed (checked in order): the official installer, Homebrew, ~/.local/bin.
    systemPaths: Object.freeze(["~/.mimocode/bin/mimo", "/opt/homebrew/bin/mimo", "/usr/local/bin/mimo", "~/.local/bin/mimo"]),
    // The release the bridge's parity suite ran against (GitHub release asset digests).
    release: Object.freeze({
      type: "zip",
      version: "0.1.15",
      tag: "v0.1.15",
      assets: Object.freeze({
        arm64: Object.freeze({ name: "mimocode-darwin-arm64.zip", size: 33820063, sha256: "9805686d8e14a5bff091833ec021aba0e7f7d41361cebf90152482e5c38e40b3" }),
        x64: Object.freeze({ name: "mimocode-darwin-x64.zip", size: 36144793, sha256: "42a3f0416dbcfb8590ae504538d27a0414e9625a7b766b2512aeafe7b8b35cad" }),
        "win32-x64": Object.freeze({ name: "mimocode-windows-x64.zip", size: 48122871, sha256: "c9b8a1bb12b4e621098b622629982715cc8423587c2640d8c2fa0113d3c09511" }),
        "win32-arm64": Object.freeze({ name: "mimocode-windows-arm64.zip", size: 46379932, sha256: "46d12eb7642ff0ae5277cfb69b60b52b3e4d4ddc4d0b9b19e0dae221753eb72a" }),
      }),
      url: "https://github.com/XiaomiMiMo/MiMo-Code/releases/download/{tag}/{name}",
    }),
  }),
});
