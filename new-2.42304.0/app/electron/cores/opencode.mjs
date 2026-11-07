// OpenCode (https://github.com/anomalyco/opencode). Adapter: harness/packages/opencode-bridge, over opencode serve (HTTP API + SSE events, OpenAPI at /doc).
// Data only (an Extension Pack manifest carries the same object; work/agents/opencode-bridge/make-pack.mjs).
export default Object.freeze({
  id: "opencode",
  // How the UI names the assistant while this core runs ("Message OpenCode", "OpenCode needs your approval").
  assistant: "OpenCode",
  // Logo key (src/brand-logos.mjs) and the one plain sentence setup shows under the name.
  brand: "opencode",
  tagline: "Open-source agent for Claude and almost any other model.",
  name: "OpenCode",
  vendor: "OpenCode",
  engine: "opencode",
  kind: "bridge",
  available: true,
  models: "Claude and any provider OpenCode supports (Anthropic, OpenRouter, GLM, Kimi, MiniMax, any OpenAI-compatible API)",
  homepage: "https://github.com/anomalyco/opencode",
  license: "MIT",
  // The adapter script, relative to the repository root (packaged: process.resourcesPath).
  bridge: Object.freeze({ script: "harness/packages/opencode-bridge/bin/app-server.mjs" }),
  // Thread.cliVersion the bridge reports: "opencode <version>".
  sessionPrefix: "opencode ",
  // The bridge reports these in initialize too (harness/packages/opencode-bridge/src/index.js capabilitiesFor).
  implies: Object.freeze({
    // Claude Code tools the agent has itself: question (AskUserQuestion) and webfetch (WebFetch).
    nativeTools: Object.freeze(["AskUserQuestion", "WebFetch"]),
    generatesTitles: true, customization: true, permissionHints: true, systemPromptPreview: true, livePermissions: true, toolSelection: true,
    codeStats: true, structuredOutput: true, deleteHistory: true, unloadOnNavigate: true, perTokenBilling: true,
    skillToggle: true, mcpConfigWrite: true, pluginManage: true, sideQuestion: true, configOverlay: true,
    // Rewind can restore files through the agent's own undo (session/revert.ts); /cd doesn't fork (forkCwd false) but
    // moves the session to another folder of its project, as OpenCode's /move does (moveCwd: codeDesktop/thread/move);
    // a connector's stored sign-in can be removed (DELETE /mcp/:name/auth).
    rewindFiles: true, forkCwd: false, moveCwd: true, mcpLogout: true,
    // Share link / Stop sharing in the session menu (codeDesktop/thread/share: OpenCode /share and /unshare).
    threadShare: true,
    // The agent's own agents (Customize, the Mode menu's Agent group) and its settings under Settings › Code.
    agentsList: true, primaryAgents: true, coreSettings: true,
    // The bridge's Seatbelt profile (opencode-bridge sandbox.js) denies network unless sandboxPolicy.networkAccess allows it.
    sandboxNetwork: "policy",
    // No tool search; it re-lists on tools/list_changed: the long app tool groups wait behind load_tools.
    deferAppTools: true,
  }),
  // The agent's own data folder (sessions and auth.json under XDG_DATA_HOME), where deleteHistory removes a session.
  historyLocation: "~/.local/share/opencode",
  // Settings › Storage (settings-pages.cjs sessionStore): every session is in the agent's own database in that folder.
  sessionStore: Object.freeze({ database: "~/.local/share/opencode" }),
  // Settings › Customize › Plugins › Add plugin (customize-model pluginFormCopy): what OpenCode's plugin list takes.
  plugins: Object.freeze({ format: "An npm package name or a file path to a plugin module.", placeholder: "package-name or /path/to/plugin.js" }),
  // The user's own config; OpenClaude Desktop's overlay lives in the bridge state folder (OPENCODE_CONFIG_DIR).
  configFile: "~/.config/opencode/opencode.json",
  skillRoots: Object.freeze(["<project>/.opencode/skills", "~/.config/opencode/skills", "<project>/.claude/skills", "~/.claude/skills", "<project>/.agents/skills", "~/.agents/skills"]),
  // Settings › Account: the agent's own sign-ins (account/login/start codeDesktop.provider / .template).
  login: Object.freeze({
    // deviceCode: OpenCode's openai auth also has "ChatGPT Pro/Plus (headless)" (account/login/start type chatgptDeviceCode).
    // OpenCode's other subscription sign-ins (GET /provider/auth): Poe in the browser; GitHub Copilot and SuperGrok (xAI)
    // with a device code (Copilot on github.com; GitHub Enterprise needs its URL, which only `opencode auth login` asks for).
    browser: Object.freeze([Object.freeze({ provider: "openai", label: "ChatGPT Pro/Plus", deviceCode: true }), Object.freeze({ provider: "poe", label: "Poe" })]),
    deviceCode: Object.freeze([Object.freeze({ type: "chatgptDeviceCode", provider: "github-copilot", label: "GitHub Copilot" }),
      Object.freeze({ type: "chatgptDeviceCode", provider: "xai", label: "SuperGrok (xAI)" })]),
    apiKey: Object.freeze([
      // keyPrefix: account-operations refuses an Anthropic or OpenRouter key pasted under another Key type.
      Object.freeze({ template: "anthropic", label: "Anthropic API key", keyUrl: "https://console.anthropic.com/settings/keys", keyPrefix: "sk-ant-" }),
      Object.freeze({ template: "openrouter", label: "OpenRouter API key", keyUrl: "https://openrouter.ai/settings/keys", keyPrefix: "sk-or-" }),
      Object.freeze({ template: "openai", label: "OpenAI API key", keyUrl: "https://platform.openai.com/api-keys" }),
      Object.freeze({ template: "zai-coding-plan", label: "Z.ai GLM Coding Plan key", keyUrl: "https://z.ai/manage-apikey/apikey-list" }),
      Object.freeze({ template: "moonshotai", label: "Moonshot (Kimi) API key", keyUrl: "https://platform.kimi.ai/console/api-keys" }),
      Object.freeze({ template: "minimax", label: "MiniMax API key", keyUrl: "https://platform.minimax.io/user-center/basic-information/interface-key" }),
      Object.freeze({ template: "deepseek", label: "DeepSeek API key", keyUrl: "https://platform.deepseek.com/api_keys" }),
      Object.freeze({ template: "xai", label: "xAI API key", keyUrl: "https://console.x.ai", keyPrefix: "xai-" }),
    ]),
    // The agent's auth store (opencode-bridge credentials.js): account/logout deletes every sign-in in it, saved API keys too.
    store: "~/.local/share/opencode",
    signOutRemovesKeys: true,
  }),
  agent: Object.freeze({
    binary: "opencode",
    // An OpenCode the user installed (checked in order): the official installer, Homebrew, ~/.local/bin, bun.
    systemPaths: Object.freeze(["~/.opencode/bin/opencode", "/opt/homebrew/bin/opencode", "/usr/local/bin/opencode", "~/.local/bin/opencode", "~/.bun/bin/opencode"]),
    // The release the bridge's parity suite ran against (GitHub release asset digests).
    release: Object.freeze({
      type: "zip",
      version: "1.18.34",
      tag: "v1.18.34",
      assets: Object.freeze({
        arm64: Object.freeze({ name: "opencode-darwin-arm64.zip", size: 45538151, sha256: "8522b70f545184b3a8d97c5ca4f814093b2476d72aebfda8c48bcd072ec31d1b" }),
        x64: Object.freeze({ name: "opencode-darwin-x64.zip", size: 49165415, sha256: "66bf0638cffad3b65bd6648cc3947619e1dd71f4bfeee0a81e087ac036bb1088" }),
        "win32-x64": Object.freeze({ name: "opencode-windows-x64.zip", size: 62158551, sha256: "8ec42ed1ad8db108052394b83ab69d0331398f761fbfff5fe50f91d65bdd3548" }),
        "win32-arm64": Object.freeze({ name: "opencode-windows-arm64.zip", size: 60647128, sha256: "b738ae4e823c862eaba6d6bd6e1d35e01b46851d7160882c7bdb189f33a16447" }),
      }),
      url: "https://github.com/anomalyco/opencode/releases/download/{tag}/{name}",
    }),
  }),
});
