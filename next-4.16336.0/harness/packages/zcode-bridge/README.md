# ZCode core for OpenClaude Desktop

This Extension Pack adds **ZCode**, Z.ai's open-source coding agent for GLM models
([github.com/zai-org/ZCode](https://github.com/zai-org/ZCode), Apache-2.0), as an OpenClaude Desktop core.

OpenClaude Desktop speaks the Codex app-server protocol (v0.155.1). This bridge speaks that protocol on stdio. Behind it,
it runs the official ZCode agent process, `zcode app-server --stdio`. That is the same process, using the same
ZCode Protocol, that the ZCode desktop app drives. The bridge plays the role of its host. Sessions, tools,
permissions, skills, MCP, plugins, compaction, sub-agents and history all stay ZCode's own.

## What the pack contains

| Path | Purpose |
|---|---|
| `manifest.json` | The core descriptor: id `zcode`, brand, release, capabilities. |
| `bridge/bin/app-server.mjs` | The entry OpenClaude Desktop runs: `node app-server.mjs app-server --stdio`. |
| `bridge/src/` | The bridge, plain Node ESM with no dependencies. |

| Module | Role |
|---|---|
| `server.js` | The method switch and the thread registry. |
| `zcode.js` | The agent process and the ZCode Protocol connection. |
| `live.js` | Turns the live session stream into Codex items. |
| `history.js` | Turns `session/messages` into Codex turns. |
| `items.js` | Maps each tool to an item. |
| `permissions.js` | Permission modes, approvals (and their session grants) and questions. |
| `instructions.js` | OpenClaude Desktop's instructions inlined into the prompt when no provider proxy can carry them. |
| `provider-proxy.js` | Per-thread system prompt, instructions and model parameters, plus the prompt preview. |
| `accounts.js` | API keys, the Coding Plan sign-in and quota. |
| `catalog.js` | Skills, MCP, plugins and hooks. |
| `usage.js` | Usage, stats and history deletion. |
| `rate-limit-watch.js` | Quota refetch after turns (`account/rateLimits/updated`). |
| `store.js` | The bridge's own metadata. |
| `locate.js` | Finds the runtime. |

The bridge imports nothing outside its folder. It resolves its own files relative to `import.meta.url`.

## The agent it runs (pinned release)

ZCode publishes the CLI/agent only inside its desktop release. No npm package or standalone CLI download exists:
the repository's `install.sh` downloads from a base URL each publisher configures for themselves.

| Field | Value |
|---|---|
| Release | ZCode **v3.14.3**, published 2026-09-24 on GitHub Releases |
| Agent inside | ZCode CLI **0.16.9** |
| Asset (arm64) | `ZCode-3.14.3-mac-arm64.dmg` |
| URL | `https://github.com/zai-org/ZCode/releases/download/v3.14.3/ZCode-3.14.3-mac-arm64.dmg` |
| Size | 185386581 bytes |
| SHA-256 | `ce690b1acf5727d1474976f832cb99bf61bcd13d72118120244c0a4ccd4e156c` (the GitHub asset digest; verified locally) |
| Used from the image | `ZCode.app/Contents/Resources/glm/zcode.cjs` (the agent, a Node bundle run under Node ≥ 24), `Resources/config/provider/zcode-builtin.json` (the provider catalog) and `Resources/tools` (native search tools), 26 MB in total |

The release has no macOS x64 build. On x64, install ZCode yourself and the bridge uses that install.

An installed `/Applications/ZCode.app` (or `~/Applications`), or a `zcode` on PATH, is also used as is.

## Capabilities reported in `initialize`

**Reported as on:**

- `customization`
- `systemPromptPreview`
- `permissionHints`
- `livePermissions`
- `toolSelection`
- `deleteHistory`
- `unloadOnNavigate`
- `codeStats`
- `skillToggle`
- `mcpConfigWrite`
- `pluginManage`
- `modelWorkflows` (ZCode's own dynamic workflows, see Dynamic workflows)

**Reported as off:**

- `structuredOutput`
- `harnessProfile`
- `providerSettings`

**Set per connection:** `perTokenBilling` is true only when no GLM Coding Plan access is configured.

`customization` and `systemPromptPreview` are on only when the bridge can front the provider endpoints (a
`zcode-builtin.json` catalog next to the agent). Without one, OpenClaude Desktop sends its instructions as
`developerInstructions`, which the bridge inlines into the prompt (see Customization).

`structuredOutput` stays off: ZCode has no output-schema turn, and a `turn/start` with an `outputSchema` fails with a
message naming `outputSchema`. OpenClaude Desktop's own workflow runner needs it, so `/workflow` runs on ZCode's engine.

**Unsupported methods:** `thread/rollback` (deprecated; OpenClaude Desktop uses `thread/revert`).

## How OpenClaude Desktop features map onto ZCode

- **Threads.** A thread is a ZCode session (`sess_…`), and `Thread.cliVersion` is `zcode <version>`.
  - Rename and delete use ZCode's V4 commands. Delete also removes the session's rows from ZCode's own database, `~/.zcode/cli/db/db.sqlite`.
  - Archive, the original input parts and the queue are bridge metadata, kept in `$CODE_DESKTOP_BRIDGE_STATE/threads.json`.
    A session archived in the ZCode app (and never archived or unarchived in OpenClaude Desktop) is listed as archived.
  - `thread/list` covers every session: ZCode's `session/list` returns only the 50 most recently updated unless asked
    for more and has no cursor, so the bridge asks for all of them (up to 5000) and pages, sorts and searches itself.
  - Fork uses `session/fork` at a turn. Compact uses `session/compact`, which is ZCode's own compaction turn.
  - Rewind (`thread/revert`) is ZCode's own conversation rewind, the branch cut the ZCode app uses to edit or retry a
    prompt. The bridge sends `/rewind conversation <messageId>` for the first prompt of the chosen turn as a control
    turn whose stream never reaches the client, then checks that the turn is gone. History only by default: files stay,
    as in Codex. With "Also restore files the agent changed" (`codeDesktop.restoreFiles`, capability `rewindFiles`) it
    sends `/rewind both <messageId>`: ZCode first puts back the files it checkpointed before each edit since that prompt,
    then cuts the conversation. When ZCode can't restore them safely it changes nothing and its reply is the error.
  - ZCode never deletes on a rewind. It records the cut in the session row (`session.revert`) and keeps the old branch.
    Its `session/messages` does not apply the cut, so the bridge reads `session.revert` (read-only, from ZCode's
    database) and shows only the active branch, also for sessions rewound in the ZCode app.
  - Steer uses V4 `sendText` with `requestedDelivery: "guide"`. When ZCode puts the guidance into the running turn
    (`turn.steerDrained`), it becomes a `userMessage` item in that turn, with the input as typed; guidance that falls
    back to the queue arrives as a new turn with its prompt. A message with images or attached files is
    not steerable (`activeTurnNotSteerable`: ZCode's guidance carries text only), so the app queues it and it goes, with its
    attachments, as the next turn.
  - ZCode's automatic retries (429 rate limits, overloads, dropped streams: `session.updated` with
    `_meta.zcode.apiRetry`, `streamRecovery.updated`) become `error` notifications with `willRetry: true` and
    `retry: {attempt, maxRetries}`, so the status row says "Retrying (n/max)…" until the model answers.
- **Permission modes:**

  | OpenClaude Desktop mode | ZCode mode |
  |---|---|
  | Ask | `build` |
  | Accept edits | `edit` |
  | Auto | `edit` (see below) |
  | Plan, chat, review | `plan` |
  | Bypass | `yolo` |

  ZCode has no sandbox, so Auto keeps asking before side-effect commands. It is never silently weaker than the
  mode the app chose. Plan approval (ExitPlanMode) becomes the plan card. Approving it switches ZCode to the mode
  that was chosen, once ZCode has left plan mode.
  - GLM can enter plan mode by itself (`EnterPlanMode`, which ZCode allows without asking). The bridge sees ZCode's
    mode change, puts the thread in Plan (the mode it was in becomes the after-plan mode) and sends
    `codeDesktop/thread/mode`, so the app's picker shows Plan. The plan card's choice then applies as usual.
- **Approvals.** ZCode's `interaction/requestPermission` becomes `item/commandExecution/requestApproval`, or
  `item/fileChange/requestApproval` for Edit and Write.
  - "Allow for this session" is a bridge-side grant, and it never covers more than the card showed. For Bash it
    covers the exact command, for WebFetch the exact URL. For a file tool (Edit, Write, MultiEdit, NotebookEdit) it
    covers edits inside the workspace (by real path, so a symlink out does not count). A file outside the workspace
    is never offered a session grant: every such edit asks. Every other tool is granted for its exact input only, so
    a code-running tool such as EvalWorkflowSnippet or NodeRepl asks again for each new snippet. A file named in
    that input (a snippet `path`) counts by its current contents. Grants are dropped whenever the mode changes (from
    the client, an approved plan, or entering and leaving a review), are not offered in Plan, chat or review, and a
    card answered after a mode switch records none.
  - ZCode's own "always allow in this project" rule is not offered, because it would outlive the session.
  - With `approvalPolicy: "never"` outside Bypass (a client that never answers approvals, such as the workflow
    runner), an ask is refused at once with a reason the model reads, instead of becoming a request no one answers.
  - One card per request. While a request waits, ZCode re-sends it under a new wire id (after 1, 2, 4 and 8 s, then
    every 10 s) with the same business `requestId`. The bridge keys cards by that id: a re-send joins the open card
    and every wire id gets the same answer. When ZCode settles a request without the bridge's answer
    (`permission.resolved`), the card closes with `serverRequest/resolved`. The same holds for questions and the plan card.
- **Customization.** The system prompt, project instructions and per-model max tokens and temperature apply
  per thread.
  - ZCode exposes no way to replace the main agent's prompt. The bridge therefore puts a loopback pass-through in front of every provider endpoint, through copies of ZCode's provider configs, and rewrites only the main-agent requests of threads with customization.
  - Provider-site model rules keep matching. The official Coding Plan endpoints still go through the ZCode platform gateway, as in ZCode itself.
  - The prompt preview is the prompt ZCode actually sent. Before a thread exists, the bridge captures it with a dry run that never reaches the model.
  - Without a provider catalog there is no proxy: `customization` is reported off, and the `developerInstructions`
    OpenClaude Desktop sends instead are inlined into the prompt in a `<code-desktop-instructions>` block. They go with the
    first prompt of a session, and again after they change, a compaction or a rewind. A slash command stays first:
    the block goes inside the arguments of a command that hands them to the model (`/skill <name> …`, `/init`,
    `/workflow`), and into a `/goal` objective, which ZCode repeats in every round it drives. Other commands (/mode,
    /model …, custom commands with positional arguments) leave it for the next prompt. The transcript, the thread
    preview and ZCode's goal replies hide the block.
- **Sub-agents.** An `Agent` call spawns a child thread (`sess_subagent_<agentId>`), opened from the parent's agent row.
  - ZCode mirrors only a sub-agent's tool calls onto the parent session's stream (`tool_subagent_<agentId>_<callId>`).
    Its thinking and text exist only in the child session's own record, which ZCode serves (`session/messages`) only
    for an open session. The bridge reads that record read-only from ZCode's database before each of the child's tool
    calls and before the child ends, so its reasoning and answer appear in the child thread in order.
  - Stop on one sub-agent (`turn/interrupt` on its child thread) stops only that sub-agent when it runs in the
    background (`Agent` with `run_in_background`): the bridge cancels its ZCode task (`session/cancelBackgroundTask`,
    task id from ZCode's `taskKind: "subagent"` task events or the spawn's `background` flag), and the parent's turn
    goes on. If ZCode refuses, the request fails with ZCode's reason. A foreground sub-agent is part of the parent's
    turn, so stopping it stops that turn. A stopped sub-agent's turn ends `interrupted`.
  - Reading a finished child thread uses ZCode's record (the same item ids as the live stream); the bridge's copy of
    the live stream is the fallback while the child runs or when ZCode has none.
- **Images GLM opens.** A `Read` of an image file (png, jpg, gif, webp: ZCode's `read-image`) is an `imageView` item,
  so the transcript shows the picture GLM looked at. A failed or declined read stays a read row with its reason.
- **Attached files.** A PDF goes to ZCode as a `pdf` attachment, a video (mp4, mov, webm, …) as `video` and an image
  file as `image`, each with its MIME type. A model that takes PDFs or videos (GLM-5.3-Flash) then gets the document
  itself, as in the ZCode app. ZCode falls back to the file path for a model that doesn't. Other files stay plain file
  attachments.
- **Tools.** Per-thread tool selection uses ZCode's per-turn `toolDenylist`. Disabled MCP servers are also left
  out of the session's MCP servers.
  - ZCode's scheduled-task tools (`CronCreate`, `CronUpdate`, `CronDelete`, `CronList`) and off-peak tools
    (`OffPeakCreate`, `OffPeakList`) are always denied, on the session and on every turn and steer, and the Tools
    menu doesn't list them. Their host side (ZCode desktop's automation store and scheduler) isn't part of Code
    Desktop. Should a call still reach the bridge, `automation/checkTaskBinding` and `automation/list` answer with no
    tasks, and a create, update or delete fails with a message saying scheduled tasks aren't available here. That
    replaces ZCode's misleading "Try again later".
- **Skills.** `skills/referenceCatalog` lists them. They are switched on and off with ZCode's own
  `skills[<SKILL.md>].enable` in `~/.zcode/cli/config.json`.
- **ZCode's slash commands** (`/init`, `/goal`, custom commands) come from the workspace's
  `/` catalog (`workspace/readPresentation`). `skills/list` reports them as commands (path `command:<name>`,
  slash-only, never switched off), so the slash menu offers them. Sent, they run as `/<name> args`. `/goal` goes
  through `session/goal`, as in the ZCode app; when it starts no turn (`/goal`, `/goal pause` …), its reply is shown as
  a turn of its own that ZCode does not keep. `/compact` and `/plan` are left out: OpenClaude Desktop's own commands do that.
- **MCP.** Servers are stored in `mcp.servers` of the same config file. Their status comes from `mcp/list`.
  OAuth uses the authorization URL ZCode reports.
  - ZCode gives a session its MCP servers when it opens it (`session/create`, `session/resume`). After a change
    (`config/batchWrite` of `mcp_servers.*`, `config/mcpServer/reload`) every loaded session is reopened
    (`session/close` + `session/resume`), as Codex refreshes each loaded thread: an idle one at once, a busy one when
    its turn ends (before a queued prompt) or before its next turn starts. A session with a background task still
    running waits for its next turn, since closing it would stop the task.
- **Plugins.** ZCode plugins come from the official marketplace, or from local folders listed in `plugins.dirs`.
  - Official Z.ai MCP services (plugins whose `.mcp.json` server declares `auth: {type: "zcode_official"}`: the finance
    data services, video-agent-kit, …) get the user's identity from the host through
    `interaction/requestOfficialMcpAuthHeaders`. The bridge answers as the ZCode desktop does, from the browser
    sign-in's credential store: `Authorization: Bearer <ZCode login JWT>`, plus `X-Bigmodel-Authorization: Bearer
    <Coding Plan token>` and `Bigmodel-Target-Type: PERSONAL` for the Coding Plan of the active family (never the other
    family's). Only the ZCode API origin (`https://zcode.z.ai`, or `ZCODE_BASE_URL` / `ZCODE_ENDPOINT_ORIGIN`) gets
    them. Without the browser sign-in the answer is ZCode's `official_auth_unavailable`, and the connector row says
    to sign in.
- **Accounts:**
  - An API key is stored as a provider from ZCode's templates; the default template is the Z.ai Coding Plan. The
    bridge then runs ZCode's own key check (`provider/testModelConnectivity`, a one-token request). A key the provider
    refuses (401/403, invalid key) is not kept: the provider file is put back as it was and the sign-in fails with the
    provider's message. Any other failure (offline, rate limited) keeps the key.
  - The Coding Plan browser sign-in runs `zcode login`. The bridge then serves the account's request key to the agent, as the ZCode desktop does.
  - Quota windows (5 hours and weekly, with reset times) come from the platform quota endpoint.
    After a turn the bridge reads the quota again (at most every 30 seconds, and at once when the turn hit the plan
    limit) and sends `account/rateLimits/updated` for each window that changed, as Codex does after every turn.
- **Dynamic workflows** run on ZCode's own engine: GLM starts one with `CreateWorkflow` (`AmendWorkflow` revises a run,
  `ResumeWorkflowRun` restarts a stopped one), and `/workflow` asks it to. OpenClaude Desktop shows each run as its workflow
  row and Tasks card (`workflowRun` on the tool item, `src/workflows.js`):
  - The gate is per session. ZCode keeps its dynamic-workflow tools off unless the host turns them on, so the bridge
    passes `dynamicWorkflowEnabled` on `session/create` and `session/resume` from OpenClaude Desktop's Dynamic workflows
    setting, never opening `workspace/updateDynamicWorkflowPolicy` for the whole process. With the setting off, the
    workflow tools are also in the session's and every turn's tool denylist. Turning it on reopens the session before
    its next turn (ZCode registers the tools when it builds the session), unless a run or background task is still live.
  - In every permission mode, one approval per run. ZCode asks before every run (`CreateWorkflow`, `AmendWorkflow`,
    `ResumeWorkflowRun` are always-ask) and then runs the workflow's agents without asking. Outside Bypass the bridge
    turns that request into one approval card ("Run this workflow? Its agents will run without asking for approval.")
    showing the script's `meta` name, description and phases; Allow covers the whole run, Deny starts nothing. For
    `CreateWorkflow` and `AmendWorkflow` the card also offers ZCode's "Allow for this session": later calls of that
    tool in the session run without a card. It is the bridge's grant, not ZCode's in-memory session rule, because
    ZCode's rule ignores the mode and would let a run start in Plan. Like every grant it is dropped when the mode
    changes. `ResumeWorkflowRun` asks every time, and there is no project grant for a run. Plan, chat and review refuse
    a run without a card. In Bypass permissions the run is allowed without a card. With `approvalPolicy: "never"`
    outside Bypass the request is refused with a reason GLM reads.
  - When a run ends, ZCode starts a turn by itself to hand GLM the result (its input is the run's `<task-notification>`,
    input source `background_task`). The bridge puts a `userMessage` in that turn, live and in history, in Code
    Desktop's own notification form, built from ZCode's `originMeta.workflowNotification` (status, run name,
    duration). The app shows it as the "Background workflow completed · {name}" row, as for its own engine, instead of
    a GLM reply with nothing above it. A workflow's stall or question notice and other background results add no row.
  - Progress comes from the run's journal. ZCode's session stream leaves out the engine's progress events, so the bridge
    polls `v4/conversation/workflowRunEvents` while a run is live. Each `ask` instance is an agent (labelled with its
    sub-agent's name); declared and entered `phase()`s are phases; `usage-updated` is the token count; `run-settled` is
    the end. A cancelled agent shows as Skipped.
  - Runs survive a restart. On resume, `v4/conversation/workflowRuns` ties each tool call to its run and the journal
    rebuilds it. Journal events carry no times, so a replayed agent has no start time or duration.
  - Stop (`codeDesktop/workflow/stop`) cancels that run's background task (`session/cancelBackgroundTask`, task id = run
    id). The turn and other runs go on. Until ZCode names the run (its approval card or compile is still part of the
    turn) the run says `stopScope: "turn"` and Stop stops that turn.
  - No per-agent Retry or Skip: ZCode's engine has no member controls, so runs never set `memberControls`.
- **Side questions** (`/btw`) use `workspace/generateText` over the transcript. They never enter the thread.
- **Usage and stats** come from `usage/stats`, ZCode's own ledger.

## Not available on ZCode

| Feature | Reason |
|---|---|
| Structured-output turns | ZCode has no output-schema turn. |
| OpenClaude Desktop's workflow runner | It needs structured output and asks no one about approvals. Workflows run on ZCode's own engine instead (see Dynamic workflows), one approval per run outside Bypass. |
| Computer use | Needs ZCode's macOS helper app and the disabled-by-default official plugin. |
| Browser control | Needs ZCode desktop's in-app browser. The bridge reports no browser backend and keeps node_repl's `js` tool off every session (unless ZCode's Computer Use, which shares it, is on). While Browser Use is on, GLM is told its skills can't run here and to use OpenClaude Desktop's preview tools instead. |
| Fast service tier | GLM has no fast tier; GLM-5.3-Flash is a separate model. |
| Scheduled tasks | ZCode's Cron* tools need ZCode desktop's automation store and scheduler (Settings › Automations), and OpenClaude Desktop has no Scheduled tasks surface yet. The tools are kept away from the model (see Tools). |
| Off-peak tasks | Same reason: `OffPeak*` needs the ZCode desktop host. The agent only offers these tools when its host turns them on. |

## Environment

| Variable | Meaning |
|---|---|
| `CODE_DESKTOP_AGENT_BINARY` | Set by OpenClaude Desktop: the agent program. |
| `CODE_DESKTOP_AGENT_RUNNER` | Set by OpenClaude Desktop. |
| `CODE_DESKTOP_NODE_BINARY` | Set by OpenClaude Desktop. |
| `CODE_DESKTOP_BRIDGE_STATE` | Set by OpenClaude Desktop. |
| `ZCODE_DATA_BASE_DIR` | Moves `~/.zcode`, as in ZCode. |
| `CODE_DESKTOP_ZCODE_PLATFORM_ORIGIN` | Test hook only. Points the Coding Plan gateway and OAuth at a local stand-in. |
| `ZCODE_BRIDGE_DEBUG` | `1` logs every ZCode notification to stderr (the first `ZCODE_BRIDGE_DEBUG_CHARS` characters, 600 by default). |
| `ZCODE_OFFICIAL_MCP_DEV_TRUSTED_ORIGINS` | ZCode's own test switch: http loopback origins that may stand in for the ZCode API origin of official MCP services. Read by ZCode and the bridge alike. |
