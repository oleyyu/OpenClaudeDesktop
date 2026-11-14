// U-SET-LITE (2026-11-12, user: "所有简介都需要简洁"): short copy for long setting descriptions. t() looks a source
// string up here before the locale dictionary, so host rows and the official settings slices (their defaultMessage goes
// through t()) both show the short line. Keys match after conciseKey(): agent and app names (Claude, DeepSeek, Codex,
// OpenClaude Desktop, {core}) and apostrophe styles don't matter, so one entry covers every core's wording.
// Each entry: [English source, short English, short Chinese]. A short line may use only the placeholders its source has.
const ENTRIES = [
  // Appearance
  ['Font for the whole interface — menus, sidebars, and panels.', 'Font for menus, sidebars and panels.', '菜单、侧栏和面板的字体。'],
  ['Reduce animation in streaming responses and other interface elements.', 'Reduce interface animation.', '减少界面动画。'],
  ['The language of menus, settings and other interface text.', 'Interface language.', '界面语言。'],
  ['Set a custom monospace font for code and terminal.', 'Monospace font for code and terminal.', '代码和终端的等宽字体。'],
  ['Applies to open files, diffs, code blocks, command output, and the terminal.', 'Applies to code, diffs and the terminal.', '用于代码、差异和终端。'],
  ['Maximum width of the transcript and composer columns.', 'Max width of the chat column.', '对话栏的最大宽度。'],
  ['The view sessions open in. Picking a view from a session’s Transcript view menu changes only that session.', 'Default view for sessions.', '会话的默认视图。'],
  ['Start from a built-in theme, or import one from a file.', 'Pick a built-in theme or import one.', '选择内置主题或导入。'],
  ['Choose System, Light or Dark under Theme on the General page.', 'Switch light or dark under Theme.', '在「主题」中切换浅色或深色。'],
  ['Used for primary buttons, links, focus rings and selection.', 'Buttons, links and selection.', '按钮、链接和选中颜色。'],
  ['Any installed font, saved with this theme. Leave empty to use the Interface font chosen on the Code page.', 'Any installed font. Empty uses the interface font.', '任意已安装字体，留空用界面字体。'],
  ['Roundness of buttons, menus, cards and the composer.', 'Corner roundness.', '圆角大小。'],
  ['Light and dark mode follow the Theme setting on the General page. Pop-out windows keep the default theme.', 'Follows the Theme setting.', '跟随「主题」设置。'],
  // Your Claude
  ['Append your instructions to the agent’s system prompt. Turn off to pause them without losing the text.', 'Added to the system prompt. Off pauses them.', '追加到系统提示词，关闭即暂停。'],
  ['Added to {core}’s built-in prompt for every project. The {core} core can’t replace its own system prompt.', 'Applies to every project.', '对所有项目生效。'],
  ['Instructions apply to this folder and its subfolders.', 'Applies to this folder and subfolders.', '作用于此文件夹及子文件夹。'],
  ['Read the nearest instructions file in this project, checked into your repository so the whole team shares it.', 'Use the project’s instructions file.', '读取项目中的指令文件。'],
  ['Stored in OpenClaude Desktop only, after the file’s instructions.', 'Stored locally, after the file’s instructions.', '仅存本机，排在文件指令之后。'],
  ['Changes apply to new sessions and to sessions reopened after a restart.', 'Applies to new sessions.', '对新会话生效。'],
  ['Remove your global text and every project override. Files in your projects are not changed.', 'Clear global and project instructions.', '清除全局和项目指令。'],
  ['Shown in approval titles, notifications and the transcript.', 'Shown in approvals and notifications.', '显示在审批和通知中。'],
  ['Replaces the spark in the sidebar and while it works.', 'Replaces the spark icon.', '替换火花图标。'],
  ['Allow Claude to search for relevant details in past chats.', 'Search past chats for context.', '从过往对话中检索信息。'],
  ['Allow Claude to remember relevant context from your chats and Cowork sessions. Memory includes your entire chat history with Claude.', 'Remember context across chats.', '跨对话记住上下文。'],
  // The other three En vt variants (never chosen without Cowork; chosen, with and without Cowork): one short line for all four.
  ['Allow Claude to remember relevant context from your chats. Memory includes your entire chat history with Claude.', 'Remember context across chats.', '跨对话记住上下文。'],
  ['Allow Claude to remember relevant context from your chats. This setting controls memory for both chats and projects.', 'Remember context across chats.', '跨对话记住上下文。'],
  ['Allow Claude to remember relevant context from your chats and Cowork sessions. This setting also applies to projects.', 'Remember context across chats.', '跨对话记住上下文。'],
  // Models
  ['Requests go to OpenAI with the ChatGPT account or OpenAI API key you sign in with on Settings › General › Account.', 'Your ChatGPT or OpenAI sign-in.', '使用你登录的 ChatGPT 或 OpenAI 账号。'],
  ['Requests go to an OpenAI Responses-compatible endpoint you choose, such as a GPT relay.', 'Any OpenAI Responses-compatible endpoint.', '任意兼容 OpenAI Responses 的端点。'],
  ['Requests go to {name} ({host}), set in your Codex config.toml. Choose Custom endpoint to use one set here instead.', 'From config.toml: {name} ({host}).', '来自 config.toml：{name}（{host}）。'],
  ['Requests go to {name}, set in your Codex config.toml. Choose Custom endpoint to use one set here instead.', 'From config.toml: {name}.', '来自 config.toml：{name}。'],
  ['Requests go through a relay that serves DeepSeek’s models.', 'Through a relay.', '经由中转服务。'],
  ['{core} keeps its own context window and output limits, so they aren’t set here.', 'Context and output limits come from {core}.', '上下文与输出上限由 {core} 决定。'],
  ['Pick the model new sessions use in Settings › Code › Model and permissions, or in the composer. A default effort set here applies whenever you switch to that model.', 'A default effort applies when you switch to that model.', '切换到该模型时使用这里的默认强度。'],
  ['How much of {core}’s reasoning the thinking block shows. Some models don’t summarize their reasoning.', 'How much reasoning to show.', '显示多少推理过程。'],
  ['How long {core}’s final answers are. Only models that support it follow this.', 'Length of final answers.', '最终回答的长度。'],
  ['Let {core} hand parts of a task to sub-agents that work in parallel. Each one uses tokens like a session of its own.', 'Work on parts of a task in parallel.', '并行处理任务的各个部分。'],
  ['The model a sub-agent uses when {core} doesn’t pick one for it. A smaller model costs less.', 'Default model for sub-agents.', '子代理的默认模型。'],
  ['The reasoning effort a sub-agent uses when {core} doesn’t pick one for it.', 'Default effort for sub-agents.', '子代理的默认推理强度。'],
  ['How many sub-agents one session can have open at the same time. Empty uses {core}’s default.', 'Max sub-agents per session.', '每个会话的子代理上限。'],
  ['How many levels deep sub-agents may start sub-agents of their own. Empty uses {core}’s default.', 'How deep sub-agents can nest.', '子代理可嵌套的层数。'],
  ['Saved in {core}’s own config, shared with the {core} CLI. New sub-agents use the change.', 'Shared with the {core} CLI.', '与 {core} CLI 共用配置。'],
  ['Shown in the model menu, the model button and sessions. Empty uses the default name.', 'Name shown in menus.', '菜单中显示的名称。'],
  ['Attach and paste images for this model. Off keeps images out of the message box.', 'Allow image attachments.', '允许附加图片。'],
  ['{core} lists this model as text only, so images can’t be sent to it.', 'Text only.', '仅支持文本。'],
  ['How many tokens the model can read, such as 128K or 1M ({min}–{max}). The core compacts the conversation before it fills up. Empty uses the model’s default.', 'Such as 128K or 1M. Empty uses the default.', '如 128K 或 1M，留空用默认值。'],
  ['0–2. Lower is more focused, higher more varied. Empty uses the model’s default.', '0–2. Empty uses the default.', '0–2，留空用默认值。'],
  ['{min}–{max}. Empty uses the model’s default.', '{min}–{max}. Empty uses the default.', '{min}–{max}，留空用默认值。'],
  ['Saved encrypted on this Mac. Type a new key to replace it.', 'Saved. Type a new key to replace it.', '已保存，输入新密钥可替换。'],
  ['Optional. Without one, the DEEPSEEK_API_KEY the app was launched with is used.', 'Optional. Falls back to DEEPSEEK_API_KEY.', '可选，默认用 DEEPSEEK_API_KEY。'],
  ['Optional. Without one, the key saved in DeepSeek Harness (~/.dsh) is used.', 'Optional. Falls back to the Harness key.', '可选，默认用 Harness 中的密钥。'],
  ['An Anthropic Messages-compatible endpoint; /v1/messages is added.', 'Anthropic Messages-compatible endpoint.', '兼容 Anthropic Messages 的端点。'],
  ['The model ids your relay serves, one per line. They replace DeepSeek’s in the model menu; leave empty if the relay uses deepseek-flash and deepseek-v4-pro.', 'One model id per line.', '每行一个模型 ID。'],
  ['Turn on the models that can read images. The composer attaches images only for those.', 'Models that can read images.', '可识别图片的模型。'],
  ['So the core compacts in time, tell it how much each model can read.', 'Context size per model.', '各模型的上下文大小。'],
  ['Web search uses DeepSeek’s official API with your saved official key. The relay key is never sent to DeepSeek.', 'Uses your official DeepSeek API key.', '使用你的 DeepSeek 官方密钥。'],
  ['Web search uses DeepSeek’s official API and needs an official DeepSeek key. Without one, web searches fail; the relay key is never sent to DeepSeek.', 'Web search needs an official DeepSeek API key.', '联网搜索需要 DeepSeek 官方密钥。'],
  ['Use a model server running on this Mac. No API key is needed.', 'A model server on this Mac. No key needed.', '本机模型服务，无需密钥。'],
  ['Start LM Studio (port 1234) or Ollama (port 11434) on this Mac to use a local model, then check again.', 'Start LM Studio or Ollama, then check again.', '启动 LM Studio 或 Ollama 后重试。'],
  ['The endpoint’s OpenAI Responses-compatible root, usually ending in /v1; /responses is added.', 'Usually ends in /v1.', '通常以 /v1 结尾。'],
  ['Not needed for a model server on this Mac. Leave it empty unless your server asks for one.', 'Not needed for local servers.', '本地服务无需密钥。'],
  ['The key your endpoint issued. It’s stored encrypted on this Mac and never shown again.', 'Stored encrypted on this Mac.', '加密保存在本机。'],
  ['The model ids the endpoint serves, one per line. The first one is the default.', 'One per line. The first is the default.', '每行一个，第一个为默认。'],
  ['Lets {core} use OpenAI’s hosted web search tool. Many relays reject it, so it’s off by default.', 'OpenAI hosted search. Many relays reject it.', 'OpenAI 托管搜索，很多中转不支持。'],
  ['Sends one small request to /responses. A relay can pass it and still reject parts of {core}’s full requests.', 'Sends one small request.', '发送一个小请求测试连通。'],
  ['{core} speaks only the OpenAI Responses API, so a relay that serves only /chat/completions can’t run it.', '{core} needs the Responses API; /chat/completions-only relays won’t work.', '{core} 只支持 Responses API，仅有 /chat/completions 的中转不可用。'],
  ['Add a relay like that as a custom provider on DeepSeek Harness instead.', 'Use them with DeepSeek Harness instead.', '这类中转请改用 DeepSeek Harness。'],
  ['Pick a vendor’s official API (DeepSeek, GLM, Kimi, Qwen, MiniMax, MiMo and more), test it and make it the default model.', 'Official APIs from GLM, Kimi, Qwen and more.', '接入 GLM、Kimi、Qwen 等官方 API。'],
  ['Defaults for every DeepSeek session; changes apply from the next request. top_p is not supported by the DeepSeek Harness adapter.', 'Applies from the next request.', '从下一次请求起生效。'],
  ['CNY per 1M tokens, used for the estimated cost on the Usage page.', 'CNY per 1M tokens, for cost estimates.', '每百万 token 的人民币价格，用于估算费用。'],
  ['An OpenAI-compatible (or Anthropic Messages) endpoint, served by the Harness pi-ai adapter. Its models join the model menu after the core restarts.', 'An OpenAI- or Anthropic-compatible endpoint.', '兼容 OpenAI 或 Anthropic 的端点。'],
  ['An OpenAI-compatible (or Anthropic Messages) endpoint. Its models join {core}’s model menu after the core restarts.', 'An OpenAI- or Anthropic-compatible endpoint.', '兼容 OpenAI 或 Anthropic 的端点。'],
  ['Stored encrypted on this Mac and passed to the core as {env}; never written to settings files.', 'Stored encrypted on this Mac.', '加密保存在本机。'],
  ['Optional. How many tokens each model can read, such as 131072, 128K or 1M. Empty: the core assumes 262,144 tokens and compacts later than a smaller model needs.', 'Optional, such as 128K or 1M.', '可选，如 128K 或 1M。'],
  ['Add an OpenAI-compatible endpoint to use its models next to DeepSeek’s.', 'Add an OpenAI-compatible endpoint.', '添加兼容 OpenAI 的端点。'],
  ['Add an OpenAI-compatible endpoint, such as a relay or a self-hosted server, to use its models in {core}.', 'Add an OpenAI-compatible endpoint.', '添加兼容 OpenAI 的端点。'],
  ['OpenClaude Desktop is the frame; the core is the agent that runs your sessions. Download only the cores you use. Your instructions, tools and permission modes apply to whichever core is running.', 'The agent that runs your sessions.', '运行会话的代理。'],
  ['DeepSeek models, and any OpenAI- or Anthropic-compatible API added in Settings › Models', 'DeepSeek models and compatible APIs', 'DeepSeek 模型及兼容 API'],
  ['GLM models (GLM Coding Plan sign-in or a Z.ai / BigModel API key)', 'GLM models via Coding Plan or API key', 'GLM 模型，Coding Plan 或 API 密钥'],
  ['Claude and any provider OpenCode supports (Anthropic, OpenRouter, GLM, Kimi, MiniMax, any OpenAI-compatible API)', 'Claude, OpenRouter and many more providers', 'Claude、OpenRouter 等众多服务商'],
  ['Kimi models (Kimi Code plan sign-in) and any OpenAI-, Anthropic- or Gemini-compatible provider in config.toml', 'Kimi models and compatible providers', 'Kimi 模型及兼容服务商'],
  ['Qwen models (Bailian / Model Studio / Coding Plan) and any OpenAI-, Anthropic- or Gemini-compatible API', 'Qwen models and compatible APIs', '通义千问模型及兼容 API'],
  ['Gemini models (Google account, Gemini API key, Vertex AI or a Gemini-compatible gateway)', 'Gemini via Google account or API key', 'Gemini，Google 账号或 API 密钥'],
  ['MiniMax models (MiniMax sign-in) and custom OpenAI- or Anthropic-compatible providers', 'MiniMax models and compatible providers', 'MiniMax 模型及兼容服务商'],
  ['OpenAI models, signed in with ChatGPT or an OpenAI API key', 'OpenAI via ChatGPT or API key', 'OpenAI，ChatGPT 或 API 密钥'],
  // Notifications
  ['Bounce the Dock icon when Claude needs your attention and the app isn’t focused.', 'Bounce the Dock icon when input is needed.', '需要你处理时弹跳程序坞图标。'],
  // Code
  ['Bypass all permission checks and let Claude work uninterrupted. This works well for workflows like fixing lint errors or generating boilerplate code. Letting Claude run arbitrary commands is risky and can result in data loss, system corruption, or data exfiltration (e.g., via prompt injection attacks). <link>See best practices for safe usage</link>', 'Skip all permission checks. Use with care.', '跳过所有权限检查，请谨慎使用。'],
  ['Bypass all permission checks and let DeepSeek work uninterrupted. This works well for workflows like fixing lint errors or generating boilerplate code. Letting DeepSeek run arbitrary commands is risky and can result in data loss, system corruption, or data exfiltration (e.g., via prompt injection attacks).', 'Skip all permission checks. Use with care.', '跳过所有权限检查，请谨慎使用。'],
  ['Prevent your computer from sleeping while a Code session is running, so long tasks can finish. Your display can still turn off. Closing the laptop lid will still put it to sleep.', 'Stay awake while a session runs.', '会话运行时保持唤醒。'],
  ['Automatically archive local sessions after a period of no activity. Sessions that are running or have background work are never archived, and a worktree with uncommitted changes is kept on disk.', 'Archive idle sessions automatically.', '自动归档闲置会话。'],
  ['Where to store Git worktrees for isolated coding sessions on this computer.', 'Where Git worktrees are stored.', 'Git worktree 的存放位置。'],
  ['Where to store Git worktrees for isolated coding sessions on this computer. SSH sessions use the Worktree folder setting on each SSH connection.', 'Where Git worktrees are stored.', 'Git worktree 的存放位置。'],
  ['Let DeepSeek write scripts that run many agents in parallel for complex tasks. Workflows can use a lot of your usage limit quickly.', 'Run many agents in parallel. Uses more quota.', '并行运行多个代理，消耗更多额度。'],
  ['{core} has no workflow engine of its own, so OpenClaude Desktop runs its workflows.', 'Run by the app for {core}.', '由应用代 {core} 运行。'],
  ['Including the keyword “ultracode” in a message opts that turn into a dynamic workflow.', 'Type “ultracode” to start a workflow.', '消息中写「ultracode」即启用。'],
  ['How many agents a workflow should aim for. A guideline for DeepSeek, not a hard limit.', 'Target agent count (a guideline).', '目标代理数（非硬性上限）。'],
  ['Workflows saved for this project and for all your projects. Run one with /<name> in a session.', 'Run one with /<name>.', '用 /<名称> 运行。'],
  ['No saved workflows yet. Ask for a workflow to be saved after it runs.', 'No saved workflows yet.', '还没有保存的工作流。'],
  ['Let commands that {core} runs in its sandbox use the network, including a proxy on this computer. Applies in Auto, Manual and Accept edits; Plan stays offline.', 'Allow network in the sandbox.', '允许沙箱内联网。'],
  ['Whether {core} can search the web: cached results, live results, or not at all. Applies to sessions you start or reopen.', 'Cached, live or off.', '缓存、实时或关闭。'],
  ['How {core} talks to you. Applies to your next message.', 'Tone of replies.', '回复风格。'],
  ['Bring over your CLAUDE.md, MCP servers, skills, hooks, commands and recent sessions. You choose what to import.', 'Import CLAUDE.md, MCP, skills and sessions.', '导入 CLAUDE.md、MCP、技能和会话。'],
  // MiMo's Import sessions row (Settings › Code › Advanced; codeDesktop/history/import).
  ['{core} can copy your Claude Code, Codex or OpenCode conversations into its own history. Nothing is imported until you choose.', 'Copy chats from Claude Code, Codex or OpenCode.', '从 Claude Code、Codex 或 OpenCode 导入对话。'],
  ['Auto asks when needed. Manual always asks before making changes. Accept edits applies file edits without asking. Plan is read-only.', 'Default permission mode.', '默认权限模式。'],
  ['When you trust a folder on this device, you allow Claude to use it and the folders inside it. Trusting a folder doesn’t add it to new tasks. When you add one to a task, you may be asked to allow it again.', 'Folders the agent may use.', '代理可使用的文件夹。'],
  ['Links open in the built-in browser instead of your default browser.', 'Open links in the built-in browser.', '在内置浏览器中打开链接。'],
  ['Sites where Claude can use its Browser tools without a permission prompt.', 'Sites allowed without asking.', '无需确认即可访问的网站。'],
  ['Claude will read and update these memories during Cowork sessions.', 'Used and updated in Cowork.', '在 Cowork 中读取和更新。'],
  ['Claude saves what it learns about you and your work during Cowork sessions. These files are stored on this device.', 'What it learns in Cowork, stored locally.', 'Cowork 中记下的内容，保存在本机。'],
  ['No memories yet. Claude will add entries here as you work together.', 'No memories yet.', '暂无记忆。'],
  ['DeepSeek can start dev servers, open a live preview, and verify code changes with screenshots, snapshots, and DOM inspection.', 'Live preview and visual checks.', '实时预览并可视化检查。'],
  ['HTML, images, PDFs, and videos Claude writes open in the Preview pane.', 'Open generated files in Preview.', '在预览面板打开生成的文件。'],
  ['Browser tabs keep cookies and logins across restarts in one saved browser shared by every session and Cowork. Per session gives each Code session its own copy instead, so sessions never see each other’s logins.', 'Shared or per-session logins.', '登录状态共享或按会话隔离。'],
  ['Allow DeepSeek to generate interactive visualizations, charts, and diagrams directly in the conversation.', 'Interactive charts and diagrams in chat.', '在对话中生成交互图表。'],
  // Desktop app
  ['Automatically start Claude when you log in to your computer.', 'Open at login.', '登录时自动打开。'],
  ['Prevent your computer from idle-sleeping while Claude is open so scheduled tasks can run. Your display can still turn off. Closing the laptop lid will still put it to sleep.', 'Stay awake for scheduled tasks.', '保持唤醒以运行定时任务。'],
  ['See how much space Claude uses on this computer.', 'Disk space used by the app.', '应用占用的磁盘空间。'],
  ['Not available in cloud Code sessions, which don’t run on this computer.', 'Local sessions only.', '仅限本地会话。'],
  ['Let Claude see and act in the apps you allow, working in the background or with full control of your screen.', 'Let the agent use apps you allow.', '让代理操作你允许的应用。'],
  ['When Claude has full control of your screen, apps hidden during a task are restored when Claude stops.', 'Restore hidden apps after a task.', '任务结束后恢复隐藏的应用。'],
  ['Background: Claude works inside the apps you allow while you keep using your computer, and asks your permission before taking full control of your screen. Full control: Claude takes control of your screen, mouse, and keyboard by default whenever Claude uses an app you allow, without asking again.', 'Background, or full control of the screen.', '后台运行，或完全控制屏幕。'],
  ['Any request Claude makes to access these apps is automatically rejected. Claude may still affect them indirectly through actions in allowed apps.', 'Requests for these apps are rejected.', '对这些应用的请求会被拒绝。'],
  ['No apps denied. Add an app to automatically reject DeepSeek’s requests for it.', 'No apps denied.', '没有被拒绝的应用。'],
  ['Add and manage MCP servers that you’re working on.', 'MCP servers you’re developing.', '你正在开发的 MCP 服务。'],
  ['{core} can’t turn tools off, so profiles don’t apply to its sessions. Choose another core in Settings › Cores to use them.', 'Not supported by {core}.', '{core} 不支持。'],
  ['Every session uses all tools until you create one.', 'Sessions use all tools by default.', '默认使用全部工具。'],
  // Cowork and Customize
  ['Instructions here apply to all Cowork sessions. Use this for preferences, conventions, or context that Claude should always know.', 'Applies to all Cowork sessions.', '对所有 Cowork 会话生效。'],
  ['Claude will keep these in mind for this and any of your associated accounts across Cowork tasks within <aupLink>Anthropic’s guidelines</aupLink>. <learnMoreLink>Learn more</learnMoreLink>', '', ''],
  ['Sub-agents {core} can hand work to. Ask for one by name in a message.', 'Ask for one by name in a message.', '在消息中按名称调用。'],
  ['To add your own skill, put a folder with a SKILL.md file in one of these folders:', 'Add a folder with a SKILL.md to one of these:', '把含 SKILL.md 的文件夹放进以下任一位置：'],
];

const NAMES = /OpenClaude Desktop|\{core\}|\{assistant\}|Claude|DeepSeek|Codex/g;
/** The lookup key: names and apostrophe styles folded, so a source matches whichever core's wording it carries. */
export const conciseKey = text => text.trim().replace(NAMES, '*').replace(/[’']/g, "'");
const TABLE = new Map(ENTRIES.map(([source, en, zh]) => [conciseKey(source), { en, zh }]));
// Only sources at least this long are looked up (every entry is longer), so short labels skip the key work.
const MIN_LENGTH = Math.min(...ENTRIES.map(([source]) => source.length));
/** The short line for `source` in `locale` ('zh-CN' or English), or null when it has none. */
export function conciseCopy(source, locale) {
  if (source.length < MIN_LENGTH) return null;
  const entry = TABLE.get(conciseKey(source));
  if (!entry) return null;
  // A source's trailing space (it runs into a link after it) stays.
  const short = locale === 'zh-CN' ? entry.zh : entry.en;
  return short ? short + source.slice(source.trimEnd().length) : short;
}
export const CONCISE_ENTRIES = ENTRIES;
