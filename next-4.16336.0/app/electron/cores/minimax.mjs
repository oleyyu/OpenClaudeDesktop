// MiniMax Code (https://github.com/MiniMax-AI/minimax-code). Adapter: harness/packages/acp-bridge, over
// `mcode acp` (Agent Client Protocol over stdio). Release: the official GitHub release archive (the npm
// package's files, run with Node); its native SQLite module (better-sqlite3, normally added by npm) is
// installed once by the bridge from the npm registry into its state folder. Data only (Extension Pack manifest).
export default Object.freeze({
  id: "minimax",
  // How the UI names the assistant while this core runs ("Message MiniMax", "MiniMax needs your approval").
  assistant: "MiniMax",
  // Logo key (src/brand-logos.mjs) and the one plain sentence setup shows under the name.
  brand: "minimax",
  tagline: "MiniMax’s coding agent, made for MiniMax models.",
  name: "MiniMax Code",
  vendor: "MiniMax",
  engine: "minimax",
  kind: "bridge",
  available: true,
  models: "MiniMax models (MiniMax sign-in) and custom OpenAI- or Anthropic-compatible providers",
  homepage: "https://github.com/MiniMax-AI/minimax-code",
  license: "MIT",
  // The adapter script, relative to the repository root (packaged: process.resourcesPath).
  bridge: Object.freeze({ script: "harness/packages/acp-bridge/bin/app-server.mjs" }),
  // Thread.cliVersion the bridge reports: "minimax <version>".
  sessionPrefix: "minimax ",
  // The ACP bridge reports these in initialize too (acp-bridge server.js capabilities()); its Seatbelt profile keeps
  // network open (the agent must reach its model API), so sandboxNetwork is "always".
  // MiniMax Code ignores max output tokens and temperature (agents/minimax.js reads no modelParams), so Settings › Models hides them.
  // Its instructions are appended to its own prompt (agents/minimax.js writes them into the global AGENTS.md), never a
  // replacement: systemPromptReplace false keeps Settings › Instructions from saying otherwise.
  implies: Object.freeze({
    // Claude Code tools the agent has itself: AskUserQuestion and web_fetch (WebFetch).
    nativeTools: Object.freeze(["AskUserQuestion", "WebFetch"]),
    generatesTitles: true, customization: true, systemPromptReplace: false, modelParams: false, permissionHints: true, systemPromptPreview: true, deleteHistory: true, unloadOnNavigate: true,
    structuredOutput: false, sideQuestion: true, sandboxNetwork: "always",
  }),
  // Claude tiers in a workflow script (agent({model: 'opus'}), an agentType's `model: haiku`) on MiniMax's own models:
  // case-insensitive patterns tried in order against the bridge's model ids (m:minimax:MiniMax-M3:v:, …). OpenClaude Desktop
  // passes them to the workflow runner (CODE_DESKTOP_WORKFLOW_MODEL_TIERS, codexAgent.js modelResolution).
  workflowModelTiers: Object.freeze({
    opus: Object.freeze([":MiniMax-M3(?:[:/]|$)", "MiniMax-M3(?![.\\d])"]),
    sonnet: Object.freeze([":MiniMax-M3(?:[:/]|$)", "MiniMax-M3(?![.\\d])"]),
    haiku: Object.freeze(["MiniMax-M3\\.1-Flash", "Flash", ":MiniMax-M3(?:[:/]|$)"]),
  }),
  configFile: "~/.minimax/config.yaml",
  // Settings › Storage (settings-pages.cjs sessionStore): every session is in mcode's SQLite database (v2/sqlite in its
  // data dir), so their size can't be told apart.
  sessionStore: Object.freeze({ database: "v2/sqlite" }),
  // Add plugin: mcode installs only an entry of its official catalog, by name (Customize › Plugins lists it under Available).
  plugins: Object.freeze({ format: "MiniMax Code installs plugins from its official catalog by name; paths and URLs aren’t supported.", placeholder: "Official plugin name" }),
  skillRoots: Object.freeze(["<project>/.minimax/skills", "<project>/.claude/skills", "<project>/.agents/skills", "~/.claude/skills", "~/.codex/skills", "~/.agents/skills", "~/.minimax/skills"]),
  // Settings › Account and setup's Sign in step: what the ACP bridge's account/login/start does for this agent
  // (harness/packages/acp-bridge/src/agents/minimax.js `login`). `mcode login --no-browser`, a device code; a MiniMax API key
  // is saved and selected by mcode itself (connectProvider: `mcode provider set-minimax-key`).
  login: Object.freeze({
    browser: Object.freeze([]),
    deviceCode: Object.freeze([Object.freeze({ type: "chatgptDeviceCode", label: "Sign in with your MiniMax account" })]),
    apiKey: Object.freeze([Object.freeze({ template: "minimax-api-key", label: "MiniMax API key", keyUrl: "https://platform.minimax.io/user-center/basic-information/interface-key" })]),
    // Where `mcode login` keeps the sign-in; account/logout (`mcode logout`) clears it for every MiniMax Code on this Mac.
    store: "~/.minimax",
  }),
  agent: Object.freeze({
    binary: "mcode",
    systemPaths: Object.freeze(["/opt/homebrew/bin/mcode", "/usr/local/bin/mcode", "~/.npm-global/bin/mcode", "~/.local/bin/mcode"]),
    release: Object.freeze({
      version: "0.6.2",
      tag: "v0.6.2",
      type: "tar.gz",
      url: "https://github.com/MiniMax-AI/minimax-code/releases/download/v{version}/{name}",
      assets: Object.freeze({
        arm64: Object.freeze({ name: "minimax-code-0.6.2.tar.gz", size: 12720447, sha256: "82872630b674f17777a434680fb0d0f841522eb89a11b7cf9c7434d0062d6479", keep: "dir", binaryPath: "package/cli.js", runner: "node" }),
        x64: Object.freeze({ name: "minimax-code-0.6.2.tar.gz", size: 12720447, sha256: "82872630b674f17777a434680fb0d0f841522eb89a11b7cf9c7434d0062d6479", keep: "dir", binaryPath: "package/cli.js", runner: "node" }),
      }),
    }),
  }),
});
