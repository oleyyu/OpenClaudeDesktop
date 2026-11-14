// Codex: the official open-source CLI (github.com/openai/codex), whose `codex app-server` is the protocol itself.
// Codex is not a built-in core: it is the Extension Pack the app ships in extensions/codex (extension-packs.cjs
// bundled), and Settings › Cores offers it only once that pack is added. Its manifest is the one description of
// Codex, read here as the Codex app-server protocol's own descriptor: a server that reports no engine (Codex, the
// UI fixtures) is read with it, pack added or not (core-registry coreForEngine).
//
// What the implied capabilities mean (core-registry.mjs header): the upstream protocol serves collaborationMode (Plan)
// and turn/start outputSchema, sandboxes commands with Seatbelt under the turn's sandboxPolicy (networkAccess
// included), and drops a file mention and codeDesktop/* extensions. review/start runs Codex's review sub-agent in a
// read-only sandbox without approval prompts (reviewReadOnly). /btw (sideQuestion) is Codex's own /side: main.cjs runs
// it as an ephemeral thread/fork (native-side-chat.cjs). '!' runs the user's own shell command (thread/shellCommand,
// shellCommands); Customize › Hooks lists hooks/list (hooksList). A new session is titled the way the Codex TUI titles
// it (titleRequest: native-thread-title.cjs). nativeTools: request_user_input (AskUserQuestion; main.cjs turns on its
// Default-mode feature). Its hosted web search reads pages too, so it gets OpenClaude Desktop's WebFetch only when launched
// with web search off (main.cjs). agentsList: Customize › Agents lists its sub-agent roles (customize-operations.cjs
// codexAgentRoles). login.store: account/logout signs out every tool on this Mac that shares ~/.codex. home: CODEX_HOME
// moves it, and boot.core.home (initialize codexHome) says where (core-registry corePath).
import manifest from "../../extensions/codex/manifest.json" with { type: "json" };

const freeze = (value) => {
  if (value && typeof value === "object") { for (const entry of Object.values(value)) freeze(entry); Object.freeze(value); }
  return value;
};
// The release this app's protocol is pinned to (the pack's agent release).
export const CODEX_PROTOCOL = manifest.core.agent.release.version;
export default freeze(structuredClone(manifest.core));
