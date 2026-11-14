// Kimi Code (https://github.com/MoonshotAI/kimi-code). Adapter: harness/packages/acp-bridge, over `kimi acp`
// (Agent Client Protocol over stdio). Release: the official single-binary GitHub release per architecture
// (the npm package needs `ws`/`qrcode` installed beside it). Data only (Extension Pack manifest).
export default Object.freeze({
  id: "kimi",
  // How the UI names the assistant while this core runs ("Message Kimi", "Kimi needs your approval").
  assistant: "Kimi",
  // Logo key (src/brand-logos.mjs) and the one plain sentence setup shows under the name.
  brand: "kimi",
  tagline: "Moonshot’s coding agent, made for Kimi models.",
  name: "Kimi Code",
  vendor: "Moonshot",
  engine: "kimi",
  kind: "bridge",
  available: true,
  models: "Kimi models (Kimi Code plan sign-in) and any OpenAI-, Anthropic- or Gemini-compatible provider in config.toml",
  homepage: "https://github.com/MoonshotAI/kimi-code",
  license: "MIT",
  // The adapter script, relative to the repository root (packaged: process.resourcesPath).
  bridge: Object.freeze({ script: "harness/packages/acp-bridge/bin/app-server.mjs" }),
  // Thread.cliVersion the bridge reports: "kimi <version>".
  sessionPrefix: "kimi ",
  // The ACP bridge reports these in initialize too (acp-bridge server.js capabilities()); its Seatbelt profile keeps
  // network open (the agent must reach its model API), so sandboxNetwork is "always".
  implies: Object.freeze({
    // Claude Code tools the agent has itself: AskUserQuestion, its cron tools and FetchURL (WebFetch).
    nativeTools: Object.freeze(["AskUserQuestion", "CronCreate", "WebFetch"]),
    generatesTitles: true, customization: true, permissionHints: true, systemPromptPreview: true, deleteHistory: true, unloadOnNavigate: true,
    structuredOutput: false, sideQuestion: true, sandboxNetwork: "always",
  }),
  configFile: "~/.kimi-code/config.toml",
  // Settings › Storage (settings-pages.cjs sessionStore): a session's folder is sessions/<workspace>/<id>/ (agents/*/wire.jsonl …).
  sessionStore: Object.freeze({ files: Object.freeze(["sessions/*/<id>/**"]) }),
  // Its MCP servers (Customize › Connectors) live in their own file.
  mcpConfigFile: "~/.kimi-code/mcp.json",
  skillRoots: Object.freeze(["<project>/.kimi-code/skills", "<project>/.agents/skills", "~/.kimi-code/skills", "~/.agents/skills"]),
  // Settings › Account and setup's Sign in step: what the ACP bridge's account/login/start does for this agent
  // (harness/packages/acp-bridge/src/agents/kimi.js `login`). `kimi login --region`, a device code on kimi.com (mainland
  // China) or kimi.ai (everywhere else), as the TUI's /login platform picker asks; or a Kimi Platform API key
  // (pay-as-you-go, kimi.js connectProvider writes its provider and models to config.toml, as /login does).
  login: Object.freeze({
    browser: Object.freeze([]),
    deviceCode: Object.freeze([
      Object.freeze({ type: "chatgptDeviceCode", provider: "kimi-cn", label: "Kimi account (kimi.com)" }),
      Object.freeze({ type: "chatgptDeviceCode", provider: "kimi-global", label: "Kimi account (kimi.ai)" }),
    ]),
    apiKey: Object.freeze([
      Object.freeze({ template: "moonshot-cn", label: "Kimi Platform API key (platform.kimi.com)", keyUrl: "https://platform.kimi.com" }),
      Object.freeze({ template: "moonshot-ai", label: "Kimi Platform API key (platform.kimi.ai)", keyUrl: "https://platform.kimi.ai" }),
    ]),
    // Where `kimi login` keeps the sign-in; account/logout (the agent's logout) clears it for every Kimi Code on this Mac.
    store: "~/.kimi-code/credentials",
  }),
  // The Add plugin form: Kimi's plugin service installs a local folder, a zip URL or a GitHub repository (POST /api/v1/plugins).
  plugins: Object.freeze({ format: "A local plugin folder, a .zip URL, or a GitHub repository URL.", placeholder: "/path/to/plugin or https://github.com/owner/repo" }),
  agent: Object.freeze({
    binary: "kimi",
    systemPaths: Object.freeze(["~/.local/bin/kimi", "/opt/homebrew/bin/kimi", "/usr/local/bin/kimi", "~/.npm-global/bin/kimi"]),
    release: Object.freeze({
      version: "2.1.1",
      tag: "@moonshot-ai/kimi-code@2.1.1",
      type: "tar.gz",
      url: "https://github.com/MoonshotAI/kimi-code/releases/download/%40moonshot-ai%2Fkimi-code%40{version}/{name}",
      assets: Object.freeze({
        arm64: Object.freeze({ name: "kimi-code-darwin-arm64.tar.gz", size: 62296524, sha256: "8c3bad99571b16abd113ab5d511a98a36b852c0d5493991842a67b8c2bc4ecd0" }),
        x64: Object.freeze({ name: "kimi-code-darwin-x64.tar.gz", size: 63561208, sha256: "f6dc0289112c24119d070f9203d44bcd53580e380819db25b58be65643b75bd4" }),
      }),
    }),
  }),
});
