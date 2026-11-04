// OpenCode (https://github.com/anomalyco/opencode). Adapter: harness/packages/opencode-bridge, over opencode serve (HTTP API + SSE events).
// The pinned release is OpenCode 2.x (its /api routes, `serve --stdio`: the bridge's src/v2); a user's own OpenCode 1.x
// (agent.systemPaths, used only when the app has no downloaded copy: core-manager agentOf) still runs on the bridge's
// 1.x path. Capabilities that differ between the two are reported by the bridge in initialize, not implied here.
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
  // The bridge reports these in initialize too (harness/packages/opencode-bridge/src/index.js capabilitiesFor), for either
  // generation. Not implied: structuredOutput (turn/start outputSchema: 1.x only) and threadShare (share links: 1.x only).
  implies: Object.freeze({
    // Claude Code tools the agent has itself: question (AskUserQuestion) and webfetch (WebFetch).
    nativeTools: Object.freeze(["AskUserQuestion", "WebFetch"]),
    generatesTitles: true, customization: true, permissionHints: true, systemPromptPreview: true, livePermissions: true, toolSelection: true,
    codeStats: true, deleteHistory: true, unloadOnNavigate: true, perTokenBilling: true,
    skillToggle: true, mcpConfigWrite: true, pluginManage: true, sideQuestion: true, configOverlay: true,
    // Rewind can restore files through the agent's own undo (1.x session/revert.ts; 2.x revert/stage + commit); /cd
    // doesn't fork (forkCwd false) but moves the session to another folder, as OpenCode's /move does (moveCwd:
    // codeDesktop/thread/move; 2.x leaves uncommitted changes where they are); a connector's stored sign-in can be removed
    // (1.x DELETE /mcp/:name/auth; 2.x its integration's credentials).
    rewindFiles: true, forkCwd: false, moveCwd: true, mcpLogout: true,
    // The agent's own agents (Customize, the Mode menu's Agent group) and its settings under Settings › Code.
    agentsList: true, primaryAgents: true, coreSettings: true,
    // The bridge's Seatbelt profile (opencode-bridge sandbox.js) denies network unless sandboxPolicy.networkAccess allows it.
    sandboxNetwork: "policy",
    // No tool search; it re-lists on tools/list_changed: the long app tool groups wait behind load_tools.
    deferAppTools: true,
  }),
  // OpenCode 1.x's data folder (sessions and auth.json under XDG_DATA_HOME), where deleteHistory removes a session.
  // OpenCode 2.x keeps OpenClaude Desktop's sessions in a database of their own in the bridge's state folder
  // (<state>/opencode-v2/opencode.db, opencode-bridge v2/db.js; never the user's OpenCode database): the bridge reports
  // that folder in initialize (capabilities.historyLocation), which the delete confirms prefer.
  historyLocation: "~/.local/share/opencode",
  // Settings › Storage (settings-pages.cjs sessionStore): every session is in the agent's own database in that folder;
  // on 2.x the bridge reports its own (capabilities.sessionStore {database: "opencode-v2"}, below its state folder),
  // which main.cjs prefers.
  sessionStore: Object.freeze({ database: "~/.local/share/opencode" }),
  // Settings › Customize › Plugins › Add plugin (customize-model pluginFormCopy): what OpenCode's plugin list takes. 2.x
  // loads a local plugin from a folder only (config/plugin/source.ts drops a file path); 1.x took a module file.
  plugins: Object.freeze({ format: "An npm package name or the path to a plugin folder.", placeholder: "package-name or /path/to/plugin-folder" }),
  // The user's own config (both generations read it); OpenClaude Desktop's overlay lives in the bridge state folder
  // (1.x: OPENCODE_CONFIG_DIR=<state>/config; 2.x: OPENCODE_CONFIG=<state>/config-v2/opencode.json).
  configFile: "~/.config/opencode/opencode.json",
  skillRoots: Object.freeze(["<project>/.opencode/skills", "~/.config/opencode/skills", "<project>/.claude/skills", "~/.claude/skills", "<project>/.agents/skills", "~/.agents/skills"]),
  // Settings › Account: the agent's own sign-ins (account/login/start codeDesktop.provider / .template).
  login: Object.freeze({
    // deviceCode: OpenCode's openai auth also has "ChatGPT Pro/Plus (headless)" (account/login/start type chatgptDeviceCode).
    // OpenCode's other subscription sign-ins (GET /provider/auth): Poe in the browser; GitHub Copilot and SuperGrok (xAI)
    // with a device code (Copilot on github.com; GitHub Enterprise needs its URL, which only `opencode auth login` asks for).
    // OpenCode 2.x: these are integration methods (POST /api/integration/:id/connect/oauth), ChatGPT by token sharing only
    // (no device code there); claude-agent uses the user's own Claude Code sign-in (`claude auth login`): the bridge
    // checks it and waits while OpenCode does (openedByAgent, Reopen shows the setup page). OpenCode 1.x refuses it.
    browser: Object.freeze([Object.freeze({ provider: "openai", label: "ChatGPT Pro/Plus", deviceCode: true }), Object.freeze({ provider: "poe", label: "Poe" }),
      Object.freeze({ provider: "claude-agent", label: "Claude (Claude Code login)" })]),
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
    // OpenCode 2.x keeps sign-ins in the bridge's own database (<state>/opencode-v2/opencode.db, opencode-bridge v2/db.js),
    // which copies this folder's API keys (auth.json) once; account/logout deletes them there, connectors' sign-ins kept.
    store: "~/.local/share/opencode",
    signOutRemovesKeys: true,
  }),
  agent: Object.freeze({
    binary: "opencode",
    // An OpenCode the user installed (checked in order): the official installer, Homebrew, ~/.local/bin, bun.
    systemPaths: Object.freeze(["~/.opencode/bin/opencode", "/opt/homebrew/bin/opencode", "/usr/local/bin/opencode", "~/.local/bin/opencode", "~/.bun/bin/opencode"]),
    // The release the bridge's 2.x path was built against (GitHub release asset digests; harness/tests/
    // opencode-bridge-v2-smoke.mjs and opencode-v2-live-probe.mjs run it). 1.18.34 was the 1.x path's (its
    // opencode-bridge-smoke.mjs); a user who needs 1.x removes the app's download and installs 1.x themselves (systemPaths).
    release: Object.freeze({
      type: "zip",
      version: "2.2.5",
      tag: "v2.2.5",
      assets: Object.freeze({
        arm64: Object.freeze({ name: "opencode-darwin-arm64.zip", size: 105851917, sha256: "25ba9908979fa7d764792c82589b4b5768ab1511154e0317d98aa77d216ce767" }),
        x64: Object.freeze({ name: "opencode-darwin-x64.zip", size: 111093657, sha256: "4d4419022e6ffbd48afc97c5101bdf001d38b0499f516169b9a80a87a340fd56" }),
      }),
      url: "https://github.com/anomalyco/opencode/releases/download/{tag}/{name}",
    }),
  }),
});
