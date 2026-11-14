// Fixed sentences a bridge core writes in English (turn errors, the italic notes it adds to a turn, a connector's
// sign-in hint, a refusal), shown in the UI language: a table of the known ones, each a t() key with the same
// placeholders, matched exactly; anything else is shown as the core wrote it.
import { t } from "../electron/i18n/index.mjs";

const PATTERNS = [
  // Gemini CLI (harness/packages/acp-bridge/src/agents/gemini.js).
  [/^Gemini CLI: sending this message would exceed the context window\. Start a new session to continue\.$/,
    () => t("Gemini CLI: sending this message would exceed the context window. Start a new session to continue.")],
  [/^Gemini CLI stopped this turn: it detected a possible loop, or the session reached its turn limit \(model\.maxSessionTurns\)\.$/,
    () => t("Gemini CLI stopped this turn: it detected a possible loop, or the session reached its turn limit (model.maxSessionTurns).")],
  [/^Gemini CLI ended the turn without a reply\. The response was likely blocked by its safety filters or was malformed\. Try rephrasing, or try again\.$/,
    () => t("Gemini CLI ended the turn without a reply. The response was likely blocked by its safety filters or was malformed. Try rephrasing, or try again.")],
  [/^Gemini CLI ended the turn without a final reply\. The response may have been blocked or malformed\.$/,
    () => t("Gemini CLI ended the turn without a final reply. The response may have been blocked or malformed.")],
  [/^Sign in to Gemini: Google sign-in is still selected in Gemini CLI but no Google account is signed in\. Sign in with Google from the account menu, or run \/auth in Gemini CLI to pick your API key\.$/,
    () => t("Sign in to Gemini: Google sign-in is still selected in Gemini CLI but no Google account is signed in. Sign in with Google from the account menu, or run /auth in Gemini CLI to pick your API key.")],
  [/^This project already has a GEMINI\.md file \((.+)\), so \/init left it unchanged\. Edit it directly, or delete it and run \/init again to have Gemini write a new one\.$/,
    (file) => t("This project already has a GEMINI.md file ({file}), so /init left it unchanged. Edit it directly, or delete it and run /init again to have Gemini write a new one.", { file })],
  [/^Sign in to (.+) in Gemini CLI: run \/mcp auth (\S+) in a gemini terminal, then check again\.$/,
    (server) => t("Sign in to {server} in Gemini CLI: run /mcp auth {server} in a gemini terminal, then check again.", { server })],
  [/^(.+) isn’t in your Gemini CLI settings\. It comes from a project’s \.gemini\/settings\.json or an extension; remove it there\.$/,
    (name) => t("{name} isn’t in your Gemini CLI settings. It comes from a project’s .gemini/settings.json or an extension; remove it there.", { name })],
  // MiniMax: a session begun in mcode's terminal runs in the user's own MiniMax home (agents/minimax.js permissionWarning).
  [/^This conversation was started in MiniMax Code's terminal, so it runs in your own MiniMax home as it is: (Ask|Accept edits) cannot stop edits inside the project, and OpenClaude Desktop's tool switches and instructions don't apply\. Start a new session in OpenClaude Desktop to use them\.$/,
    (mode) => t("This conversation was started in MiniMax Code’s terminal, so it runs in your own MiniMax home as it is: {mode} can’t stop edits inside the project, and OpenClaude Desktop’s tool switches and instructions don’t apply. Start a new session in OpenClaude Desktop to use them.", { mode: mode === "Ask" ? t("Manual") : t("Accept edits") })],
  [/^This conversation was started in MiniMax Code's terminal, so it runs in your own MiniMax home as it is: OpenClaude Desktop's tool switches and instructions don't apply\. Start a new session in OpenClaude Desktop to use them\.$/,
    () => t("This conversation was started in MiniMax Code’s terminal, so it runs in your own MiniMax home as it is: OpenClaude Desktop’s tool switches and instructions don’t apply. Start a new session in OpenClaude Desktop to use them.")],
  // Gemini's sign-in hint after the agent's own refusal (agents/gemini.js authHint): the agent's text stays, the hint reads
  // in the UI language.
  [/^([\s\S]*\S)\s+(Gemini CLI is set to use Vertex AI: set GOOGLE_CLOUD_PROJECT and GOOGLE_CLOUD_LOCATION \(with Application Default Credentials\), or GOOGLE_API_KEY\.|Gemini CLI has no API key for its selected sign-in method: set GEMINI_API_KEY, sign in with Google, or pick another method with \/auth in Gemini CLI\.)$/,
    (message, hint) => `${message} ${t(hint)}`],
  // Why Qwen hides a skill (agents/qwen.js qwenSkillHidden), naming which settings file.
  [/^Hidden by skills\.disabledLevels in (your Qwen Code settings|this project’s Qwen Code settings|the Qwen Code system settings)\.$/, (where) => t("Hidden by skills.disabledLevels in {where}.", { where: t(where) })],
  [/^Turned off by skills\.disabled in (your Qwen Code settings|this project’s Qwen Code settings|the Qwen Code system settings)\.$/, (where) => t("Turned off by skills.disabled in {where}.", { where: t(where) })],
  [/^Off by default \(skills\.defaultDisabled in (your Qwen Code settings|this project’s Qwen Code settings|the Qwen Code system settings)\)\.$/, (where) => t("Off by default (skills.defaultDisabled in {where}).", { where: t(where) })],
  // Stopping one ZCode sub-agent (zcode-bridge server.js subagentStopError).
  [/^ZCode no longer knows this sub-agent’s task, so it couldn’t be stopped\. It may have already finished\.$/, () => t("ZCode no longer knows this sub-agent’s task, so it couldn’t be stopped. It may have already finished.")],
  [/^ZCode can’t stop this sub-agent on its own\. Stop the whole turn instead\.$/, () => t("ZCode can’t stop this sub-agent on its own. Stop the whole turn instead.")],
  // DeepSeek goals (codex-app-server goals.js goalMutate).
  [/^The goal used all its rounds\. Set a new goal with \/goal to keep going\.$/, () => t("The goal used all its rounds. Set a new goal with /goal to keep going.")],
  [/^The goal is already running\.$/, () => t("The goal is already running.")],
  [/^The goal can’t do that from where it is now\.$/, () => t("The goal can’t do that from where it is now.")],
  [/^The goal changed meanwhile\. Try again\.$/, () => t("The goal changed meanwhile. Try again.")],
  [/^This session has no goal\. Set one with \/goal and an objective\.$/, () => t("This session has no goal. Set one with /goal and an objective.")],
  [/^Add the new objective after \/goal edit\.$/, () => t("Add the new objective after /goal edit.")],
  // MiMo's own workflow engine (opencode-bridge index.js / projection.js).
  [/^Turn on Dynamic workflows in Settings › Dynamic workflows, with MiMo’s own workflow engine, to (resume|stop) this workflow\.$/,
    (action) => action === "resume" ? t("Turn on Dynamic workflows in Settings › Dynamic workflows, with MiMo’s own workflow engine, to resume this workflow.") : t("Turn on Dynamic workflows in Settings › Dynamic workflows, with MiMo’s own workflow engine, to stop this workflow.")],
  [/^\/(\S+) runs a MiMo workflow\. Turn on Dynamic workflows in Settings › Dynamic workflows, with MiMo's own workflow engine, to use it\.$/,
    (command) => t("/{command} runs a MiMo workflow. Turn on Dynamic workflows in Settings › Dynamic workflows, with MiMo’s own workflow engine, to use it.", { command })],
  [/^MiMo couldn’t resume this workflow: it is still running, or MiMo no longer has its script\.$/, () => t("MiMo couldn’t resume this workflow: it is still running, or MiMo no longer has its script.")],
  [/^MiMo can’t resume this workflow run\.$/, () => t("MiMo can’t resume this workflow run.")],
  [/^MiMo stopped before this workflow finished\.$/, () => t("MiMo stopped before this workflow finished.")],
  // Customize › Agents' Create agent on OpenCode / MiMo (opencode-bridge index.js agentWrite / agentRemove).
  [/^An agent named ([a-z0-9-]+) already exists there\.$/, (name) => t("An agent named {name} already exists there.", { name })],
  [/^Use lowercase letters, digits and dashes for the agent name\.$/, () => t("Use lowercase letters, digits and dashes for the agent name.")],
  [/^Describe when to use this agent\.$/, () => t("Describe when to use this agent.")],
  [/^Write the model as provider\/model\.$/, () => t("Write the model as provider/model.")],
  [/^Write the agent’s instructions\.$/, () => t("Write the agent’s instructions.")],
  [/^Open a project first to add an agent to it\.$/, () => t("Open a project first to add an agent to it.")],
  [/^This agent has no file of its own to remove\.$/, () => t("This agent has no file of its own to remove.")],
  // ZCode's saved workflows and run settings (zcode-bridge server.js).
  [/^ZCode can’t find this saved workflow\.$/, () => t("ZCode can’t find this saved workflow.")],
  [/^ZCode no longer has this deliverable\.$/, () => t("ZCode no longer has this deliverable.")],
  [/^ZCode can only change a running workflow’s settings\.$/, () => t("ZCode can only change a running workflow’s settings.")],
  [/^ZCode couldn’t change this workflow’s settings: (Nothing changed\.|That model isn’t available\.|Its script is gone\.|Its script no longer compiles\.|ZCode no longer has this run\.|This run’s settings can’t be changed\.)$/,
    (why) => t("ZCode couldn’t change this workflow’s settings: {reason}", { reason: t(why) })],
  // ZCode's own workflow engine (zcode-bridge workflows.js STOP_SUMMARY, settle, applyWorkflowToolResult): why a run
  // stopped or failed, and an agent's fallback error. ZCode's own error text is kept as it is.
  [/^Stopped by the agent$/, () => t("Stopped by the agent")],
  [/^The model provider stopped the workflow$/, () => t("The model provider stopped the workflow")],
  [/^Interrupted \(ZCode stopped before the workflow finished\)$/, () => t("Interrupted (ZCode stopped before the workflow finished)")],
  [/^Replaced by a revised run$/, () => t("Replaced by a revised run")],
  [/^Workflow failed$/, () => t("Workflow failed")],
  [/^Declined$/, () => t("Declined")],
  [/^The workflow didn’t start\.$/, () => t("The workflow didn’t start.")],
  [/^Workflow ended \((\S+)\)$/, (status) => t("Workflow ended ({status})", { status })],
  [/^The workflow ([a-z_]+)$/, (status) => t("Workflow ended ({status})", { status })],
  [/^Agent failed$/, () => t("Agent failed")],
  [/^Workflow ended before completion$/, () => t("Workflow ended before completion")],
  // Qwen stopped saving the session (agents/qwen.js QWEN_RECORDING_DEGRADED).
  [/^Qwen Code can’t save this session anymore \(check your free disk space\)\. New messages won’t come back after a restart: start a new session to keep your work\.$/,
    () => t("Qwen Code can’t save this session anymore (check your free disk space). New messages won’t come back after a restart: start a new session to keep your work.")],
  // Qwen's opt-in tools (agents/qwen.js qwenOptInReason), in the Tools menu.
  [/^Off in Qwen’s settings \(tools\.todoWrite\.enabled\)\.$/, () => t("Off in Qwen’s settings (tools.todoWrite.enabled).")],
  [/^Qwen turns this on only with (lsp\.enabled|experimental\.agentTeam) in its settings\.$/, (key) => t("Qwen turns this on only with {key} in its settings.", { key })],
  // MiniMax sessions begun in mcode's terminal (agents/minimax.js): its 2-minute tool timeout.
  [/^This conversation was started in MiniMax Code's terminal, so MiniMax Code stops waiting for OpenClaude Desktop's own tools \(terminal, preview, Workflow\) after 2 minutes\. Answer their approval cards within that time, or start a new session in OpenClaude Desktop\.$/,
    () => t("This conversation was started in MiniMax Code’s terminal, so MiniMax Code stops waiting for OpenClaude Desktop’s own tools (terminal, preview, Workflow) after 2 minutes. Answer their approval cards within that time, or start a new session in OpenClaude Desktop.")],
  // MiniMax's official plugins need its account sign-in (agents/minimax.js minimaxPluginError), behind the core's name.
  [/^(?:MiniMax Code: )?Sign in with your MiniMax account \(Settings › Account\) to install or change MiniMax’s official plugins\.$/,
    () => t("Sign in with your MiniMax account (Settings › Account) to install or change MiniMax’s official plugins.")],
  [/^(?:MiniMax Code: )?MiniMax Code couldn’t confirm your MiniMax sign-in in time\. Try again in a moment\.$/,
    () => t("MiniMax Code couldn’t confirm your MiniMax sign-in in time. Try again in a moment.")],
  // acp-bridge server.js deferRestart: a settings change waiting for (or cutting short) the session's background work.
  [/^(.+) keeps its current settings while its background work runs \((.+)\)\. Your change applies once that work has ended\.$/,
    (core, work) => t("{core} keeps its current settings while its background work runs ({work}). Your change applies once that work has ended.", { core, work: work === "scheduled tasks" ? t("scheduled tasks") : work })],
  [/^(.+) restarted to apply the stricter permission mode, which stopped its background work \((.+)\)\.$/,
    (core, work) => t("{core} restarted to apply the stricter permission mode, which stopped its background work ({work}).", { core, work: work === "scheduled tasks" ? t("scheduled tasks") : work })],
  // acp-bridge server.js rewind: files the agent's own rewind could not put back.
  [/^(.+) could not restore some files: (.+)$/, (core, files) => t("{core} could not restore some files: {files}", { core, files })],
  // Gemini CLI's folder trust (agents/gemini.js GEMINI_UNTRUSTED_FOLDER).
  [/^Gemini CLI ignores this folder’s GEMINI\.md, \.gemini settings, hooks, skills and connectors until you trust the folder\.$/,
    () => t("Gemini CLI ignores this folder’s GEMINI.md, .gemini settings, hooks, skills and connectors until you trust the folder.")],
  // The untrusted folder keeps OpenClaude Desktop's tools server out too (agents/gemini.js GEMINI_UNTRUSTED_TOOLS /
  // GEMINI_UNTRUSTED_FOLDER_AND_TOOLS).
  [/^Gemini CLI starts no connectors here, including OpenClaude Desktop’s preview, terminal, Workflow, question and file tools, until you trust the folder\.$/,
    () => t("Gemini CLI starts no connectors here, including OpenClaude Desktop’s preview, terminal, Workflow, question and file tools, until you trust the folder.")],
  [/^Gemini CLI ignores this folder’s GEMINI\.md, \.gemini settings, hooks and skills, and starts no connectors \(OpenClaude Desktop’s preview, terminal, Workflow, question and file tools included\), until you trust the folder\.$/,
    () => t("Gemini CLI ignores this folder’s GEMINI.md, .gemini settings, hooks and skills, and starts no connectors (OpenClaude Desktop’s preview, terminal, Workflow, question and file tools included), until you trust the folder.")],
  // ZCode's project hooks waiting for the ZCode app's review (zcode-bridge catalog.hooksList).
  [/^This project’s hooks are waiting for review\. Open the folder in the ZCode app and trust them there; until then ZCode doesn’t run them\.$/,
    () => t("This project’s hooks are waiting for review. Open the folder in the ZCode app and trust them there; until then ZCode doesn’t run them.")],
  // Gemini CLI's new project hooks in a trusted folder (agents/gemini.js folderNotice), named before it runs them.
  [/^Gemini CLI will run this project’s hooks from \.gemini\/settings\.json: (.+)\. Remove them there if you didn’t add them\.$/,
    (hooks) => t("Gemini CLI will run this project’s hooks from .gemini/settings.json: {hooks}. Remove them there if you didn’t add them.", { hooks })],
  // Gemini settings that keep OpenClaude Desktop's tools server out (agents/gemini.js geminiAppToolsBlock).
  [/^Gemini CLI’s (project settings \(\.gemini\/settings\.json\)|system settings|admin settings|settings) don’t allow OpenClaude Desktop’s tools server \(mcp\.allowed, mcp\.excluded or admin MCP settings\), so Gemini can’t use the preview, terminal or Workflow tools in this folder\.$/,
    (where) => t("Gemini CLI’s {where} don’t allow OpenClaude Desktop’s tools server (mcp.allowed, mcp.excluded or admin MCP settings), so Gemini can’t use the preview, terminal or Workflow tools in this folder.", { where: t(where) })],
  // Qwen Code's connector sign-in hint (agents/qwen.js), for a server it can't sign in to from here.
  [/^Sign in to (.+) in Qwen Code: run \/mcp auth (\S+) in a qwen terminal, then check again\.$/,
    (server) => t("Sign in to {server} in Qwen Code: run /mcp auth {server} in a qwen terminal, then check again.", { server })],
];

/** The UI-language text for a known bridge sentence, else the text itself. */
export function localizeBridgeText(text) {
  if (typeof text !== "string" || !text) return text;
  for (const [pattern, render] of PATTERNS) {
    const match = pattern.exec(text);
    if (match) return render(...match.slice(1));
  }
  return text;
}

/** A turn note the bridge renders as one italic paragraph (`_…_`): its sentence localized, the markup kept. */
export function localizeBridgeNote(text) {
  if (typeof text !== "string") return text;
  const note = /^_([^_\n][\s\S]*[^_\n])_$/.exec(text);
  if (!note) return text;
  const localized = localizeBridgeText(note[1]);
  return localized === note[1] ? text : `_${localized}_`;
}
