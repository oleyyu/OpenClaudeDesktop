// Gemini CLI (https://github.com/google-gemini/gemini-cli). Adapter: harness/packages/acp-bridge, over
// `gemini --acp` (Agent Client Protocol over stdio). Release: the official npm package (a self-contained
// Node bundle, no dependencies), kept as a folder and run with Node. Data only (Extension Pack manifest).
export default Object.freeze({
  id: "gemini",
  // How the UI names the assistant while this core runs ("Message Gemini", "Gemini needs your approval").
  assistant: "Gemini",
  // Logo key (src/brand-logos.mjs) and the one plain sentence setup shows under the name.
  brand: "geminicli",
  tagline: "Google’s coding agent, made for Gemini models.",
  name: "Gemini CLI",
  vendor: "Google",
  engine: "gemini",
  kind: "bridge",
  available: true,
  models: "Gemini models (Google account, Gemini API key, Vertex AI or a Gemini-compatible gateway)",
  homepage: "https://github.com/google-gemini/gemini-cli",
  // The Bypass dialog's "security guide" link (Gemini CLI's sandbox and approval guidance).
  securityUrl: "https://github.com/google-gemini/gemini-cli/blob/main/docs/cli/sandbox.md",
  license: "Apache-2.0",
  // The adapter script, relative to the repository root (packaged: process.resourcesPath).
  bridge: Object.freeze({ script: "harness/packages/acp-bridge/bin/app-server.mjs" }),
  // Thread.cliVersion the bridge reports: "gemini <version>".
  sessionPrefix: "gemini ",
  // The ACP bridge reports these in initialize too (acp-bridge server.js capabilities()); its Seatbelt profile keeps
  // network open (the agent must reach its model API), so sandboxNetwork is "always".
  implies: Object.freeze({
    // Claude Code tools the agent has itself: web_fetch (WebFetch); no question tool under ACP (ask_user is excluded in ACP mode): OpenClaude Desktop's AskUserQuestion stands in.
    nativeTools: Object.freeze(["WebFetch"]),
    generatesTitles: true, customization: true, permissionHints: true, systemPromptPreview: true, deleteHistory: true, unloadOnNavigate: true,
    structuredOutput: false, sideQuestion: true, sandboxNetwork: "always",
  }),
  // Claude tiers in a workflow script (agent({model: 'opus'}), an agentType's `model: haiku`) on Gemini's own models,
  // before the runner's fallback (which would pick the "auto" router for every tier): case-insensitive patterns tried
  // in order against the bridge's model ids (CODE_DESKTOP_WORKFLOW_MODEL_TIERS, codexAgent.js modelResolution).
  workflowModelTiers: Object.freeze({
    opus: Object.freeze(["(?:^|[:/])gemini-3(?:\\.\\d+)?-pro", "(?:^|[:/])gemini-[\\d.]+-pro"]),
    sonnet: Object.freeze(["(?:^|[:/])gemini-[\\d.]+-pro", "(?:^|[:/])gemini-[\\d.]+-flash(?!-lite)"]),
    haiku: Object.freeze(["(?:^|[:/])gemini-[\\d.]+-flash-lite", "(?:^|[:/])gemini-[\\d.]+-flash"]),
  }),
  configFile: "~/.gemini/settings.json",
  // Gemini CLI's documented setup is an `export` in the shell profile (an API key, Vertex AI or a Workspace project):
  // codex.cjs passes these from the login shell, which a Finder or Dock launch never sees (proxy-env.cjs).
  shellEnv: Object.freeze(["GEMINI_API_KEY", "GOOGLE_API_KEY", "GOOGLE_GENAI_USE_VERTEXAI", "GOOGLE_GENAI_USE_GCA", "GOOGLE_CLOUD_PROJECT",
    "GOOGLE_CLOUD_PROJECT_ID", "GOOGLE_CLOUD_LOCATION", "GOOGLE_APPLICATION_CREDENTIALS", "GOOGLE_GEMINI_BASE_URL", "GEMINI_CLI_HOME", "GEMINI_MODEL"]),
  // Settings › Storage (settings-pages.cjs sessionStore): a session is tmp/<project>/chats/session-<time>-<first 8 of
  // its id>.jsonl, its sub-agents' chats under chats/<id>/ (chatRecordingService.ts) and its plans under tmp/<project>/<id>/.
  sessionStore: Object.freeze({ files: Object.freeze(["tmp/*/chats/session-*-<id8>.jsonl", "tmp/*/chats/<id>/**", "tmp/*/<id>/**"]) }),
  skillRoots: Object.freeze(["<project>/.gemini/skills", "<project>/.agents/skills", "~/.gemini/skills", "~/.agents/skills"]),
  // Settings › Account and setup's Sign in step: what the ACP bridge's account/login/start does for this agent
  // (harness/packages/acp-bridge/src/agents/gemini.js `login`). ACP authenticate(oauth-personal), a browser page; or a
  // Gemini API key from AI Studio, which the bridge checks and keeps in its own state (gemini.js connectProvider).
  login: Object.freeze({
    browser: Object.freeze([Object.freeze({ provider: "google", label: "Sign in with Google" })]),
    apiKey: Object.freeze([Object.freeze({ template: "gemini-api-key", label: "Gemini API key", keyUrl: "https://aistudio.google.com/apikey", keyPrefix: "AIza" })]),
    // Where Gemini CLI keeps the Google sign-in (oauth_creds.json); account/logout removes it for every Gemini CLI on this Mac.
    store: "~/.gemini",
  }),
  agent: Object.freeze({
    binary: "gemini",
    systemPaths: Object.freeze(["/opt/homebrew/bin/gemini", "/usr/local/bin/gemini", "~/.npm-global/bin/gemini", "~/.local/bin/gemini"]),
    release: Object.freeze({
      version: "0.62.0",
      tag: "v0.62.0",
      type: "tgz",
      // npm dist.integrity sha512-A1rw0Tf2sHLpGncfYdaq5WaJIufKAP8il4BmHD5Yw4ewmB/Wo0vRQb2bEvx7OqyaPFPZCh0hVhcMKsICZyIBww==
      url: "https://registry.npmjs.org/@google/gemini-cli/-/gemini-cli-{version}.tgz",
      assets: Object.freeze({
        arm64: Object.freeze({ name: "gemini-cli-0.62.0.tgz", size: 20787241, sha256: "2276032b1c33d2b828b1cf197e52f48e74b0a395326763ff01a80d97d0fbc0c3", keep: "dir", binaryPath: "package/bundle/gemini.js", runner: "node" }),
        x64: Object.freeze({ name: "gemini-cli-0.62.0.tgz", size: 20787241, sha256: "2276032b1c33d2b828b1cf197e52f48e74b0a395326763ff01a80d97d0fbc0c3", keep: "dir", binaryPath: "package/bundle/gemini.js", runner: "node" }),
      }),
    }),
  }),
});
