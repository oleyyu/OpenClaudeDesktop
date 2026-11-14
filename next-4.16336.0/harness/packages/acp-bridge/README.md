# ACP bridge for OpenClaude Desktop

One bridge that makes an [Agent Client Protocol](https://agentclientprotocol.com) agent look like a Codex
app-server (protocol v0.155.1, JSON-RPC lines on stdio), so OpenClaude Desktop can run it as a core. It drives four
official agents, each through a small adapter:

| Core | Agent | Release pinned | Launch |
| --- | --- | --- | --- |
| `gemini` | [Gemini CLI](https://github.com/google-gemini/gemini-cli) (Apache-2.0) | 0.62.0, npm `@google/gemini-cli` (self-contained bundle) | `gemini --acp` |
| `qwen` | [Qwen Code](https://github.com/QwenLM/qwen-code) (Apache-2.0) | 0.24.7, npm `@qwen-code/qwen-code` (self-contained bundle) | `qwen --acp` |
| `kimi` | [Kimi Code](https://github.com/MoonshotAI/kimi-code) (MIT) | 2.1.1, GitHub release single binary per arch | `kimi acp` |
| `minimax` | [MiniMax Code](https://github.com/MiniMax-AI/minimax-code) (MIT) | 0.6.2, GitHub release archive | `mcode acp` |

Zero runtime dependencies; Node 22+. Entry: `node bin/app-server.mjs app-server --stdio`.

## How it runs

- **Which agent:** `bridge/pack.json` (`{"agent": "gemini"}`) in an Extension Pack, else `CODE_DESKTOP_ACP_AGENT`,
  else the npm package owning `CODE_DESKTOP_AGENT_BINARY`, its file name, or its `--help` output (`src/agents/index.js`).
- **One agent process per loaded thread.** On these agents the system prompt, tool selection, model parameters
  and sandbox are process settings, so each thread gets its own process with its own launch files; a settings
  change relaunches it between turns and reopens the session (`session/resume`, else `session/load`).
- **Thread id = ACP session id.** The bridge keeps its own index and projected history in
  `CODE_DESKTOP_BRIDGE_STATE` (`store.js`), so history, titles and usage survive restarts without replaying the
  agent; sessions the agent made elsewhere (its own CLI) are listed and replayed on first open.
- **Permissions:** the agent stays in its asking mode (or its plan mode for Plan / chat / review); the bridge answers
  every `session/request_permission` by OpenClaude Desktop's mode (`permissions.js`) and shows a Codex approval card only
  when the mode asks. A read-only thread nobody answers (approvalPolicy `never` in a read-only sandbox without a mode
  hint: the `/workflow` runner's agents in Plan or Ask) is `readOnly`: the agent's asking mode, not its plan mode
  (which would have it plan and end on a plan review or a question), edits refused, and whatever would ask refused. The agent process runs in a macOS Seatbelt sandbox per mode (`sandbox.js`): writes only to
  the session folders (Auto, Ask, Accept edits) or none (read-only modes); Bypass runs unsandboxed. File writes and
  commands that come through ACP `fs/*` / `terminal/*` are checked again at the boundary (`client-services.js`).
  "Allow for this session" is kept by the bridge (`SessionGrants`): the exact command, an edit tool inside the
  session folders only, or the exact input of any other tool (files it names pinned by content). It is never offered
  or honoured in Plan / chat / review and is dropped on every mode change; the agent is only ever told `allow_once`
  (Gemini's and Qwen's own `allow_always` cover every command with the same first word, Kimi's the whole tool).
- **Customization:** the custom system prompt replaces the agent's own (Gemini `GEMINI_SYSTEM_MD`, Qwen
  `QWEN_SYSTEM_MD`, Kimi `SYSTEM.md`); project instructions are appended (Qwen `--append-system-prompt`, Gemini an
  included memory file, Kimi the `${base_prompt}` template). MiniMax has no prompt replacement for its primary
  agent: both go to the global instructions file of the thread's home. Disabled tools/MCP servers go to the agent's
  own tool settings. Gemini, Kimi and MiniMax read those from files in their home, so a thread with its own settings
  runs on an overlay of that home (`overlay.js`: every entry linked, only the replaced files are the thread's).
  MiniMax refuses a linked session database, so every MiniMax thread has its own home with its own `v2/` (deleted
  with the thread; forks share their source's).
- **Agent quirks handled:** Gemini's same-minute session clobber and corrupt-copy cleanup on `session/load`
  (`beforeLoad`/`afterLoad`), its unreadable ACP fs errors, its `[MODE_UPDATE]` chunks and self-relaunch; Qwen's
  usage frames, deferred tools, own background turns and follow-up suggestions (off unless the user turned them on,
  then forwarded as `codeDesktop/promptSuggestion`); Kimi's silent turn failures, plan-file reads, background
  `/compact` (the turn stays open until the result) and token totals (its session logs' `usage.record` lines);
  MiniMax's native SQLite module (installed into the bridge state from npm, resolved through
  `minimax-native-hook.mjs`), its questionnaires and plan reviews (ACP `elicitation/create`, `plan_update`) and
  its delegations (child threads from `mcode/session/delegation_update`, stopped with `delegation/stop`). Kimi's
  AskUserQuestion also arrives as an `elicitation/create` form (every question, multi-select).
- **Turns the agent starts itself:** Qwen's goal rounds and background notices (`_qwencode/start_turn` /
  `end_turn`) and its cron and `/loop` runs (an echoed `user_message_chunk` with `_meta.source`, closed once Qwen
  goes quiet after a usage frame) are turns of their own: the thread counts as running (messages queue, leaving the
  session does not stop it), and a session with scheduled jobs stays loaded when the user navigates away.
- **Plan approaches:** Kimi's ExitPlanMode options (`plan_opt_<i>`) follow the plan card as a question card (one
  option per approach with its description, plus "Leave Plan mode without implementing" = `plan_reject_and_exit`).
- **Rewind:** Gemini (session file `$rewindTo`), Qwen (`qwen/control/session/rewind`) and Kimi (its own undo through
  a throwaway `kimi web` server on an overlay of the thread's home: `POST /sessions/{id}:undo`; files stay as they are).
- **Gemini specifics:** its own sandbox is off (`GEMINI_SANDBOX=false`, OpenClaude Desktop's Seatbelt confines it instead);
  `is_background` shell commands are tracked (Background tasks lists and stops them, closing the session stops them);
  a session file its retention cleanup deleted is written back from the bridge's history; turn tokens come from the
  session file (cached and thinking tokens included).
- **MiniMax per-thread files (`agents/minimax-config.js`):** config.yaml with `permissionMode: default`, mcode's own
  sandbox off inside the Seatbelt profile and the tool switches in `agents.default` (tools, media `builtinTools`,
  `features.delegation` / `webSearch`); a valid v2 permission.json for Ask / Accept edits that keeps the user's deny
  and ask rules. Skill and plugin on/off state is copied from the user's mcode database into each thread's
  (`agents/minimax-state.cjs`, run with mcode's Node); the skill switch writes the user's database. A conversation
  begun in the mcode terminal runs in the user's home as it is (a warning says these settings don't apply there).
- **Models and efforts:** a session's thought-level option belongs to its current model, so discovery switches a
  throwaway session through the models (`session/set_config_option`) and records each one's efforts (Kimi reads
  them from config.toml). A model or effort picked mid-session applies before the next prompt, through the
  session's model option (on Qwen, `session/set_model` would also rewrite the global default).
- **Gemini commands, todos, topics:** custom TOML commands (user, trusted project, extensions) are listed in the
  slash menu and expanded at `turn/start` as Gemini's TUI does (`{{args}}`, `@{file}`, `!{shell}` after a command
  card); `write_todos` fills the plan panel from the session file; `update_topic` names the thread.
- **Catalog:** skills from the agent's skill folders plus its ACP commands (slash menu); MCP servers from its config,
  checked by a small MCP client for status and tools (`mcp-probe.js`: stdio, streamable HTTP, SSE, Gemini's
  auto-detection, Gemini's and Qwen's stored MCP OAuth tokens); plugins = Gemini/Qwen extensions, MiniMax plugins
  (install/remove/enable through the agent's own CLI), Kimi plugins (enable/disable/remove in `installed.json`;
  installed from Kimi's own `/plugins`); hooks = Kimi's `[[hooks]]` and plugin hooks (`hooks/list`).
- **Side questions (`/btw`):** Qwen answers natively (`qwen/control/session/btw`); otherwise a throwaway session with
  no tools reads the thread's transcript and is deleted afterwards.

## Capabilities reported in `initialize`

`customization`, `permissionHints`, `systemPromptPreview`, `livePermissions`, `toolSelection`, `codeStats`,
`skillToggle` (Gemini, Qwen, MiniMax), `mcpConfigWrite`, `pluginManage` (Gemini, Qwen, MiniMax, Kimi), `pluginInstall`
(false for Kimi), `hooksList` (Kimi), `deleteHistory`,
`unloadOnNavigate`, `perTokenBilling` (API-key accounts), `backgroundTerminals` (Kimi, Gemini). `structuredOutput` and
`modelWorkflows` are false. `unsupportedMethods`: `thread/compact/start` (Gemini), `thread/revert` (MiniMax).

## Files

- `bin/app-server.mjs` — entry.
- `src/server.js` — the Codex method switch, threads, turns, approvals.
- `src/agent-host.js` — one ACP agent process and connection.
- `src/projection.js` — `session/update` → Codex items and notifications.
- `src/permissions.js`, `src/sandbox.js`, `src/client-services.js` — modes, Seatbelt, fs/terminal.
- `src/store.js`, `src/usage.js` — bridge state, token ledger.
- `src/catalog.js`, `src/mcp-probe.js`, `src/overlay.js`, `src/input.js`, `src/diff.js`, `src/side-question.js`.
- `src/agents/{gemini,qwen,kimi,minimax}.js` — per-agent adapters; `src/agents/minimax-native-hook.mjs` resolves
  MiniMax Code's native SQLite module from the bridge's copy.
- `testing/` — scripted model server, MCP server and agent setup used by the tests (not shipped in packs).

Tests: `harness/tests/acp-bridge.test.mjs` (unit), `harness/tests/acp-bridge-smoke.mjs` (real agents, scripted model).
Diagnostics: `CODE_DESKTOP_ACP_TRACE=<file>` logs every ACP line both ways.
