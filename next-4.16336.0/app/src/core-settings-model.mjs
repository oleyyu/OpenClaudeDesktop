import { t } from "../electron/i18n/index.mjs";
// Labels for the agents' own settings OpenClaude Desktop can change (acp-bridge codeDesktop/coreSettings/*): keyed by the
// setting's dotted key so the bridge never sends display text. An unknown key keeps its key as the label.
// A label may depend on the core (the same key in Gemini's and Qwen's settings.json): it gets the core id.
const LABELS = {
  "privacy.usageStatisticsEnabled": (core) => core === "qwen"
    ? [t("Share usage statistics"), t("Qwen Code sends anonymous usage data to Alibaba Cloud to improve Qwen Code. Turn this off to stop it.")]
    : core === "mimo"
      ? [t("Send usage statistics"), t("MiMo Code sends model and tool usage data, tagged with the session, to Xiaomi. Turn this off to stop it. MiMo Code restarts when nothing is running.")]
      : [t("Send usage statistics"), t("Gemini CLI sends anonymous usage statistics to Google. Turn this off to stop it.")],
  // MiMo Code's own config (opencode-bridge core-settings.js), kept in OpenClaude Desktop's overlay.
  "compaction.auto": () => [t("Compact automatically"), t("Summarize earlier messages when the context window fills up.")],
  "compaction.max_context": () => [t("Context limit"), t("Compact once a conversation reaches this many tokens, to save cost on large-context models. Empty: the model’s full window.")],
  "memory.disable_write": () => [t("Stop saving memory"), t("MiMo Code stops writing new memories (checkpoints, MEMORY.md, notes) and skips automatic dream and distill runs. What it saved stays readable.")],
  "dream.auto": () => [t("Tidy memory automatically"), t("When a session starts, MiMo Code consolidates its saved memories in the background (dream), which uses tokens.")],
  "distill.auto": () => [t("Package workflows automatically"), t("When a session starts, MiMo Code turns repeated work into reusable workflows in the background (distill), which uses tokens.")],
  // OpenCode's Exa web search (OPENCODE_ENABLE_EXA).
  "websearch.enabled": () => [t("Web search"), t("Give OpenCode its web search tool with any provider. Searches go to Exa’s public search service. OpenCode restarts when nothing is running.")],
  // OpenCode's experimental background sub-agents (OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS).
  "subagents.background": () => [t("Background sub-agents"), t("Let OpenCode run sub-agents in the background while it keeps working, and tell it when each finishes. Experimental in OpenCode. OpenCode restarts when nothing is running.")],
  "model.compressionThreshold": () => [t("Compress context at"), t("How full the context window gets before Gemini summarizes earlier messages (0.1 to 1). Its only compaction control.")],
  "model.disableLoopDetection": () => [t("Turn off loop detection"), t("Let Gemini keep going when it thinks it is repeating itself.")],
  "model.maxSessionTurns": () => [t("Max session turns"), t("How many user, model and tool turns a session keeps. -1 means unlimited.")],
  "general.sessionRetention.enabled": () => [t("Clean up old sessions"), t("Delete old chats automatically.")],
  "general.sessionRetention.maxAge": () => [t("Keep chat history for"), t("Chats older than this are deleted when cleanup is on.")],
  "general.outputLanguage": () => [t("Reply language"), t("The language Qwen answers in, such as Chinese or English. Empty: Qwen decides.")],
  "general.gitCoAuthor.commit": () => [t("Co-author trailer on commits"), t("Add Qwen as a Co-authored-by trailer to commits it makes.")],
  "general.gitCoAuthor.pr": () => [t("Co-author note on pull requests"), t("Mention Qwen in pull requests it opens.")],
  "context.fileFiltering.respectGitIgnore": () => [t("Respect .gitignore"), t("Leave files your .gitignore lists out of searches and @ mentions.")],
  "context.fileFiltering.respectQwenIgnore": () => [t("Respect .qwenignore"), t("Leave files your .qwenignore lists out of searches and @ mentions.")],
  "disableAllHooks": () => [t("Turn off all hooks"), t("Skip every hook in Qwen’s settings.")],
  "fastModel": () => [t("Fast model"), t("A lighter model for prompt suggestions and quick background work. Default: the main model.")],
  "compactionModel": () => [t("Compaction model"), t("The model that summarizes earlier messages when the context fills up.")],
  "visionModel": () => [t("Vision model"), t("Reads images for a main model that can’t, so screenshots still work.")],
  "imageModel": () => [t("Image model"), t("The model the image generation tool uses.")],
  // Qwen's voice input is its terminal's /voice; OpenClaude Desktop has no dictation, so the row says where it applies.
  "voiceModel": () => [t("Voice model"), t("The model that transcribes voice input in Qwen Code’s terminal (/voice). OpenClaude Desktop has no voice input.")],
  "advisorModel": () => [t("Advisor model"), t("A second model Qwen can ask for advice on hard steps.")],
  "memory.enableManagedAutoMemory": () => [t("Auto memory"), t("After turns, Qwen saves facts from your conversations in the background and recalls them in later sessions. Each save is an extra model call on your account.")],
  "memory.enableManagedAutoDream": () => [t("Memory consolidation"), t("Qwen periodically tidies its saved memories in the background, which also uses model calls.")],
  "ui.enableFollowupSuggestions": () => [t("Suggest a next prompt"), t("After a turn, Qwen suggests what to ask next in the composer. Each suggestion costs an extra model call.")],
  "tools.todoWrite.enabled": () => [t("Todo list"), t("Qwen keeps a checklist of the steps of a longer task, and the session shows it as Qwen works.")],
  "general.outputStyle": () => [t("Response style"), t("How Qwen writes its replies. Explanatory explains its choices as it codes; Learning asks you to write small parts. This is Qwen’s own setting, so it also applies in Qwen Code’s terminal. A custom system prompt turns styles off.")],
  // ZCode's desktop settings the agent asks its host for (zcode-bridge zcodeCoreSettingDefs; defaults from the ZCode app).
  "memoryEnabled": () => [t("Workspace memory"), t("GLM saves and reuses long-term context for each project. Applies to new sessions and may add model requests and token costs.")],
  "nativeSearchEnhancementsEnabled": () => [t("Enhanced Find and Grep"), t("Use ZCode’s faster file search tools in new sessions.")],
  // MiniMax Code's own config.yaml (acp-bridge minimax.js MINIMAX_CORE_SETTINGS).
  "memory.enabled": () => [t("Memory"), t("MiniMax Code remembers durable facts between sessions and adds them to later prompts. Turn this off to stop it remembering.")],
  "memory.proactive": () => [t("Suggest memories"), t("MiniMax Code asks itself after turns whether something is worth remembering, which uses extra tokens.")],
  "review.mode": () => [t("Code review runs"), t("Where MiniMax Code’s reviewer works: as a separate sub-agent, or inside the main conversation.")],
  "beta.autoMemory": () => [t("Auto memory (beta)"), t("MiniMax Code extracts memories, writes a daily digest and promotes useful sessions in the background, which uses tokens.")],
  "skills.external.enabled": () => [t("Skills from other tools"), t("Load skills from Claude Code, Codex and .agents folders. Off: only MiniMax Code’s own skills.")],
  "skills.external.sources.workspace-minimax.enabled": () => [t("Project .minimax skills"), t("Skills in this project’s .minimax/skills folders.")],
  "skills.external.sources.workspace-cc.enabled": () => [t("Project Claude Code skills"), t("Skills in this project’s .claude/skills folders.")],
  "skills.external.sources.workspace-agents.enabled": () => [t("Project .agents skills"), t("Skills in this project’s .agents/skills folders.")],
  "skills.external.sources.user-cc.enabled": () => [t("Your Claude Code skills"), t("Skills in ~/.claude/skills.")],
  "skills.external.sources.user-codex.enabled": () => [t("Your Codex skills"), t("Skills in ~/.codex/skills.")],
  "skills.external.sources.user-agents.enabled": () => [t("Your .agents skills"), t("Skills in ~/.agents/skills.")],
};
// A select setting's option as the UI names it; an unknown option shows as it is.
const OPTION_LABELS = {
  "review.mode": { subagent: () => t("As a sub-agent"), inline: () => t("In the main conversation") },
  "general.outputStyle": { default: () => t("Default"), Concise: () => t("Concise"), Proactive: () => t("Proactive"), Explanatory: () => t("Explanatory"), Learning: () => t("Learning") },
};
/** The text a select setting's option shows. */
export function coreSettingOptionLabel(key, option) {
  return OPTION_LABELS[key]?.[option]?.() ?? String(option);
}
/** A setting's label and description; `core` (boot.core, or a core id) picks a core's own wording where it differs. */
export function coreSettingLabel(key, core) {
  const id = typeof core === "string" ? core : typeof core?.engine === "string" ? core.engine : typeof core?.id === "string" ? core.id : null;
  const entry = LABELS[key]?.(id);
  return entry ? { label: entry[0], description: entry[1] } : { label: key, description: "" };
}
/** The '{value} (default)' text of a setting's default for its select / input placeholder. */
export function coreSettingDefault(setting) {
  if (setting.default === null || setting.default === undefined) return t("Default");
  if (setting.type === "boolean") return setting.default ? t("On by default") : t("Off by default");
  return t("Default: {value}", { value: setting.type === "select" ? coreSettingOptionLabel(setting.key, setting.default) : String(setting.default) });
}
