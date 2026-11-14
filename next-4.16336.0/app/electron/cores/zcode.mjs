// ZCode (https://github.com/zai-org/ZCode, Apache-2.0). Adapter: harness/packages/zcode-bridge — it drives the
// official agent process (`zcode app-server --stdio`, the ZCode Protocol the ZCode desktop app itself uses) and
// serves the Codex app-server protocol. Data only (Extension Pack manifest core).
//
// The agent ships only inside the official desktop release (GitHub Releases, a DMG): the CLI is
// ZCode.app/Contents/Resources/glm/zcode.cjs (a Node bundle, run under Node), with its provider catalog in
// Resources/config and native search tools in Resources/tools. Release type "dmg" with extractPaths needs the
// core-manager support described in work/agents/zcode-bridge (README); an installed ZCode.app is used as is.
export default Object.freeze({
  id: "zcode",
  // How the UI names the assistant while this core runs ("Message GLM", "GLM needs your approval").
  assistant: "GLM",
  name: "ZCode",
  vendor: "Z.ai (Zhipu)",
  brand: "zai",
  tagline: "Z.ai’s coding agent, made for GLM models.",
  engine: "zcode",
  kind: "bridge",
  // ZCode runs approved commands unconfined (no Seatbelt; zcode-bridge README): Settings › Code says Sandbox mode: None
  // (settings-model sandboxFacts) and drops the Sandbox network access switch.
  sandbox: false,
  available: true,
  models: "GLM models (GLM Coding Plan sign-in or a Z.ai / BigModel API key)",
  homepage: "https://github.com/zai-org/ZCode",
  license: "Apache-2.0",
  // The adapter script, relative to the repository root (packaged: process.resourcesPath).
  bridge: Object.freeze({ script: "harness/packages/zcode-bridge/bin/app-server.mjs" }),
  // Thread.cliVersion the bridge reports: "zcode <version>".
  sessionPrefix: "zcode ",
  // Its own dynamic-workflow tool (on its own engine the ultracode reminders name it; OpenClaude Desktop's Workflow tool
  // isn't there): GLM loads the dynamic-workflows skill, then calls CreateWorkflow.
  workflowTool: Object.freeze({ name: "CreateWorkflow", skill: "dynamic-workflows" }),
  // What the bridge reports in initialize (it always reports them; listed here for the pack summary).
  implies: Object.freeze({
    // Claude Code tools the agent has itself: AskUserQuestion and WebFetch. ZCode's own Cron* tools need a host-side
    // automation service OpenClaude Desktop doesn't provide (zcode-bridge UNAVAILABLE_TOOLS keeps them off every session), so
    // GLM gets OpenClaude Desktop's session scheduler (agent-tools/schedule.mjs CronCreate/CronList/CronDelete) instead.
    nativeTools: Object.freeze(["AskUserQuestion", "WebFetch"]),
    generatesTitles: true, compactInstructions: true, customization: true, permissionHints: true, systemPromptPreview: true, livePermissions: true, toolSelection: true,
    deleteHistory: true, unloadOnNavigate: true, codeStats: true, skillToggle: true, mcpConfigWrite: true, pluginManage: true,
    structuredOutput: false, sideQuestion: true,
    // Rewind can restore the files GLM changed (ZCode's `/rewind both`, zcode-bridge revertThread).
    rewindFiles: true,
    // hooks/list: ZCode's own hooks (config.json), listed read-only in Customize › Hooks.
    hooksList: true,
    // The @ menu lists this folder's other sessions; GLM reads a '[#title](#id)' with ReadSessionContext.
    sessionMentions: true,
    // Customize lists ZCode's sub-agents (codeDesktop/agents/list); Settings › Code has its Workspace Memory and search
    // switches (codeDesktop/coreSettings); /goal and the goal strip use thread/goal/* (capabilities.goals).
    agentsList: true, coreSettings: true, coreSettingsInConfig: false, goals: true,
    // ZCode's own dynamic workflows (CreateWorkflow / AmendWorkflow / ResumeWorkflowRun) run /workflow; zcode-bridge
    // src/workflows.js projects each run as item.workflowRun and codeDesktop/workflow/stop stops one. ZCode runs a
    // workflow's agents unasked, so outside Bypass the bridge asks once before each run starts (an approval card that
    // covers that run's agents); Settings › Code › Dynamic workflows can run ZCode's workflows on OpenClaude Desktop's engine.
    modelWorkflows: true,
  }),
  // The agent's own session database, which deleteHistory removes a session from (zcode-bridge locate.js sessionDb).
  historyLocation: "~/.zcode/cli/db",
  // Settings › Storage (settings-pages.cjs sessionStore): every session is in that database (below the core home, ~/.zcode).
  sessionStore: Object.freeze({ database: "cli/db" }),
  // Settings › Customize › Plugins › Add plugin (customize-model pluginFormCopy): what ZCode's plugin install takes.
  plugins: Object.freeze({ format: "A local folder with .zcode-plugin/plugin.json, or name@marketplace.", placeholder: "/path/to/plugin or name@marketplace" }),
  // Settings › Account for this core (account-settings-model.mjs bridgeLogin): the bridge's account/login/start
  // browser sign-in (type "chatgpt" with codeDesktop.provider) and API key (type "apiKey" with codeDesktop.template).
  login: Object.freeze({
    browser: Object.freeze([
      Object.freeze({ provider: "zai", label: "Sign in with GLM Coding Plan (Z.ai)" }),
      Object.freeze({ provider: "bigmodel", label: "Sign in with GLM Coding Plan (BigModel, China)" }),
    ]),
    apiKey: Object.freeze([
      Object.freeze({ template: "zai-api", label: "Z.ai Coding Plan key", keyUrl: "https://z.ai/manage-apikey/apikey-list" }),
      Object.freeze({ template: "bigmodel-api", label: "BigModel Coding Plan key (China)", keyUrl: "https://open.bigmodel.cn/" }),
      Object.freeze({ template: "zai-standard-api", label: "Z.ai API key", keyUrl: "https://z.ai/manage-apikey/apikey-list" }),
    ]),
    // ZCode's credential store, shared with the ZCode app (zcode-bridge accounts.js): `zcode logout` clears it.
    store: "~/.zcode/v2",
  }),
  configFile: "~/.zcode/cli/config.json",
  // ZCode loads skills from the home folders and from <dir>/.zcode/skills and <dir>/.agents/skills for every folder from
  // the session folder up to its git root (adapters/src/skills/roots.ts); `.zcode` before `.agents` at each level.
  skillRoots: Object.freeze(["<project>/.zcode/skills", "<project>/.agents/skills", "~/.zcode/skills", "~/.agents/skills"]),
  agent: Object.freeze({
    binary: "zcode",
    systemPaths: Object.freeze([
      "/Applications/ZCode.app/Contents/Resources/glm/zcode.cjs",
      "~/Applications/ZCode.app/Contents/Resources/glm/zcode.cjs",
      "~/.zcode/runtime/zcode/bin/zcode.mjs",
    ]),
    release: Object.freeze({
      version: "3.14.3",
      tag: "v3.14.3",
      url: "https://github.com/zai-org/ZCode/releases/download/{tag}/{name}",
      type: "dmg",
      assets: Object.freeze({
        // GitHub release asset digest (sha256) and size; the release has no macOS x64 build.
        arm64: Object.freeze({
          name: "ZCode-3.14.3-mac-arm64.dmg",
          size: 185386581,
          sha256: "ce690b1acf5727d1474976f832cb99bf61bcd13d72118120244c0a4ccd4e156c",
          type: "dmg",
          keep: "dir",
          extractPaths: Object.freeze(["ZCode.app/Contents/Resources/glm", "ZCode.app/Contents/Resources/config", "ZCode.app/Contents/Resources/tools"]),
          binaryPath: "ZCode.app/Contents/Resources/glm/zcode.cjs",
          runner: "node",
          versionArgs: Object.freeze(["--version"]),
        }),
      }),
    }),
  }),
});
