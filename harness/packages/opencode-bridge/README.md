# OpenCode / MiMo Code bridge for OpenClaude Desktop

A zero-dependency Node bridge that makes the official **OpenCode** and **MiMo Code** (Xiaomi's OpenCode fork)
binaries speak the Codex app-server protocol (v0.155.1, JSON-RPC lines on stdio) that OpenClaude Desktop drives.
One bridge serves both agents; it ships as two Extension Packs (`opencode`, `mimo`) built by
`work/agents/opencode-bridge/make-pack.mjs` (the pack's `bridge/src` must include `src/v2/`).

OpenCode comes in two HTTP API generations: **2.x** (the pinned release, `src/v2/`, see "OpenCode 2.x" below) and
**1.x** (a user's own install; MiMo Code is always 1.x). `<binary> --version` decides at start (`flavor.js detectApi`,
`CODE_DESKTOP_OPENCODE_API` overrides it); the sections up to "OpenCode 2.x" describe the 1.x path.

```
node bin/app-server.mjs app-server --stdio
```

## What the pack contains

| Path | |
|---|---|
| `manifest.json` | pack format 1; `core` = the core descriptor (data only), `bridge.script` = `bridge/bin/app-server.mjs` |
| `bridge/bin/app-server.mjs` | entry: detects the agent, starts the bridge |
| `bridge/src/*.js` | the bridge (no imports outside this folder, no npm dependencies) |
| `README.md` | this file |

The agent program itself is not in the pack: OpenClaude Desktop downloads the pinned official release (size + sha256
checked) or uses the user's own install.

## Pinned agent releases

| Agent | Version | Assets (darwin) | sha256 |
|---|---|---|---|
| OpenCode | 2.2.5 (`v2.2.5`, github.com/anomalyco/opencode) | `opencode-darwin-arm64.zip` 105851917 B | `25ba9908979fa7d764792c82589b4b5768ab1511154e0317d98aa77d216ce767` |
| | | `opencode-darwin-x64.zip` 111093657 B | `4d4419022e6ffbd48afc97c5101bdf001d38b0499f516169b9a80a87a340fd56` |
| MiMo Code | 0.1.15 (`v0.1.15`, github.com/XiaomiMiMo/MiMo-Code) | `mimocode-darwin-arm64.zip` 33820063 B | `9805686d8e14a5bff091833ec021aba0e7f7d41361cebf90152482e5c38e40b3` |
| | | `mimocode-darwin-x64.zip` 36144793 B | `42a3f0416dbcfb8590ae504538d27a0414e9625a7b766b2512aeafe7b8b35cad` |

OpenCode 1.18.34 (`v1.18.34`: arm64 45538151 B `8522b70f…d31d1b`, x64 49165415 B `66bf0638…bb1088`) was the 1.x path's
pinned release and is what its smoke runs against (`opencode-bridge-smoke.mjs --opencode <1.x binary>`). The app
runs the copy it downloaded itself first; the user's own OpenCode (descriptor `agent.systemPaths`: `~/.opencode/bin`,
Homebrew, `~/.local/bin`, bun) only when there is none. So an app copy of 1.18.34 is offered the 2.2.5 update, and
going back to 1.x after taking it is: Settings › Code core › Remove download (or delete `<userData>/cores/opencode/`
but its `state` folder), then install 1.x in a `systemPaths` location (the release's own zip, or the official installer /
Homebrew at a 1.x version) and restart the core. A 1.x binary is detected as 1.x by `--version`; outside the app,
`CODE_DESKTOP_AGENT_BINARY=<1.x binary>` (and, to force it, `CODE_DESKTOP_OPENCODE_API=v1`, which still needs a 1.x
binary). Threads made under 2.x stay hidden under 1.x (and the other way round): they live in different databases.

## How it works

- **Server.** One `opencode serve` / `mimo serve` per bridge on a random loopback port with HTTP basic auth (fresh
  random password). The global SSE stream (`/global/event`) carries every session's events.
- **Config overlay.** `OPENCODE_CONFIG_DIR` / `MIMOCODE_CONFIG_DIR` points at `<state>/config`, layered over the
  user's own config: Settings › Models custom providers (`CODE_DESKTOP_PROVIDERS_FILE`, keys by `{env:…}` reference),
  Connectors (MCP) added in OpenClaude Desktop, skill switches, plugins added in OpenClaude Desktop, `autoupdate: false`.
- **Plugin.** `<state>/config/plugin/code-desktop.js` (generated, no imports) is the per-session channel the HTTP API
  lacks: custom system prompt (replaces the assembled prompt; skills/MCP catalogs kept), project instructions,
  per-model temperature / max tokens, the shell sandbox profile, and a capture of the real prompt for the preview.
- **Sandbox.** `$SHELL` (and OpenCode's `shell` config) is a wrapper that runs every agent shell command under macOS
  Seatbelt: workspace-write (cwd + extra roots + temp, network per sandboxPolicy) for Auto/Ask/Accept edits,
  read-only for Plan/chat/review, none for Bypass. Fails closed to read-only.
- **Permissions.** Each session's ruleset makes every non-read call ask; the bridge answers each `permission.asked`
  from the thread's *current* mode (allow, Codex approval card, or reject), so Mode changes apply mid-turn.
  "Allow for this session" is kept by the bridge per root thread (the ask's `always` patterns) and answers later
  asks only in a mode that may act; it is never offered in Plan / chat / review and is dropped on every mode change
  (a card answered across one records none); the agent is only ever told `once`. Cards still open for asks the new grant
  covers (OpenCode runs a step's tool calls in parallel) are withdrawn and answered `once` too. OpenCode's own `always` is stored per
  project folder and outranks every session ruleset, so it would reach other sessions and the read-only modes.
  MiMo's background actors (the actor tool's default `spawn`) never ask: they read the session ruleset and fail
  closed otherwise, so on MiMo the ruleset also grants what the mode allows (Auto: every tool except paths outside
  the workspace, secrets and repeated calls; Accept edits: edits; Bypass: everything) plus the session grants, and
  is re-PATCHed on every mode change. A switch to a read-only mode mid-turn still stops edits at once (the plugin's
  edit guard) and shell writes (the sandbox). The user's own config denies (`opencode.json` / `mimocode.json`,
  global and project) are appended after the bridge's rules in every mode, MiMo's compose-only skills
  (`compose:*`) stay denied and are left out of `skills/list`, and the plan file under the data folder (a folder
  without git) is writable in Plan.
- **Account.** `account/read` reports an account only for providers that hold a credential: the agent's auth store
  (`<data>/<agent>/auth.json`: browser sign-ins `oauth`, saved keys `api`), a key environment variable, a
  Settings › Models provider, or a key in the user's config. The free tier (OpenCode Zen, MiMo Auto) and providers
  the agent's config lists without a key (MiMo's `xiaomi`) are not an account; `<agent>.freeTier` names the free
  tier and `<agent>.providers[].auth` how each provider is signed in. A browser sign-in reads as Codex's
  `chatgpt` account with `planType` naming what was signed in to (ChatGPT Pro/Plus, Xiaomi MiMo, GitHub Copilot …),
  so no reader mistakes another vendor's sign-in for ChatGPT. `account/logout` without `codeDesktop.provider`
  removes every credential in the auth store; `<agent>.canSignOut` says whether there is any, and with none the
  logout fails with where the remaining key lives (an environment variable, Settings › Models, the config). When
  `GET /provider` fails (the server still starting) the answer rests on the auth store alone, `<agent>.unknown` is
  true and `requiresOpenaiAuth` false, and `account/updated` follows once the provider list answers. The default
  model prefers a provider with a credential, then the free tier, then a provider still missing its key.
- **MCP OAuth.** `mcpServer/oauth/login` listens on the agent's callback address (127.0.0.1:19876, or the server's
  `oauth.redirectUri` / `callbackPort`) before starting the agent's flow (`POST /mcp/:name/auth`), so the agent
  leaves that port alone; the redirect's state is checked and the code goes to `POST /mcp/:name/auth/callback`.
- **Plugins.** `plugin/installed` lists what the agent loads for the home folder and the asked-for project folders
  (`cwds`; `plugin/read` reuses the last ones): the global config's `plugin`, each project's config file, and the
  `{plugin,plugins}/*.{ts,js}` files of every config folder (`~/.config/<agent>`, `<project>/.<agent>`). `GET /config`
  answers the merged list without origins, so each row carries `codeDesktop.origin` (`globalConfig`, `globalFolder`,
  `projectConfig`, `projectFolder`, `codeDesktop`) with a localized description (`{en, zh-CN}`) saying where it comes
  from, and `[spec, options]` entries keep their options (shown, not edited). `plugin/read` returns the hooks and
  tools (`tools: [{name, description}]`) the plugin registers, read from its source (a local file, or the package
  entry in the agent's package cache) without running it; a tool is kept when the agent lists it for that folder.
- **Plan review.** The plan card's "Keep planning": OpenCode's `plan_exit` ends the turn on `No`, so typed feedback
  is queued as the next message. MiMo's keeps the turn on any answer but `Yes`, and takes any other answer as the
  user's feedback, so the feedback is the answer itself and MiMo refines the plan in the same turn.
- **MiMo workflows.** A `workflow` tool run is the call's `item.workflowRun` (structure tree polled while it runs). A
  run that outlives its call (`async: true`, a `resume` call, a settled run MiMo ran again) follows MiMo's run list
  (`GET /workflows?sessionID=`, its transcript route, the `workflow.*` events): `background: true`, and its Stop asks
  the model to cancel it with MiMo's own tool (`stopScope: 'run'`; MiMo has no cancel route). A failed or stopped
  top-level run is `resumable`: `codeDesktop/workflow/resume` calls `POST /workflows/:runID/resume` (Dynamic
  workflows on MiMo's engine, not in a read-only mode). A run MiMo's list keeps running that this MiMo no longer
  holds (it quit) ends failed. A command wins over a skill of its name (MiMo's `/deep-research`); a command whose
  template calls `workflow({…})` carries `requiresWorkflowTool` and is refused while the thread withholds the tool.
- **OpenClaude Desktop's tools.** The plugin names the app thread with the `__code_desktop_session` argument
  (`tool.execute.before`); `experimental.chat.messages.transform` drops it from every step's history, so the model
  never sees it and the prompt prefix stays the same across steps and turns.
- **State.** `threads.json` may be shared by several bridges (a workflow run starts its own core on the same state
  folder): a flush re-reads it under a lock file and writes only the fields this process changed.
- **MiMo differences** handled: `MIMOCODE_*` env, `mimocode.json`, snake_case tool arguments, sub-agent actors inside
  the parent session (projected as `<session>~<actor>` threads), `task` work items as the plan checklist, the
  `prompt_async` rate limit (turns use `POST /message`), title revisions on rename.

## Capabilities (initialize)

`customization`, `permissionHints`, `systemPromptPreview`, `livePermissions`, `toolSelection`, `codeStats`,
`structuredOutput`, `deleteHistory`, `unloadOnNavigate`, `perTokenBilling`, `skillToggle`, `mcpConfigWrite`,
`pluginManage`; not: `modelWorkflows`, `harnessProfile`, `providerSettings`, `computerUse`, `backgroundTerminals`.
`unsupportedMethods`: `thread/rollback` (rewind uses `thread/revert`), `thread/backgroundTerminals/terminate`.
`capabilitiesFor(flavor, api)`: OpenCode 2.x reports `structuredOutput: false` (no per-turn format: the workflow runner
asks for JSON in the prompt) and `threadShare: false` (no share route), plus `historyLocation` and `sessionStore`
(its own database below the bridge's folder); the descriptor implies neither `structuredOutput` nor `threadShare`, so
what the running generation reports decides (`app/tests/core-registry.test.mjs`, `tests/opencode-bridge-v2-wrapup.test.mjs`).

## Environment

| Variable | |
|---|---|
| `CODE_DESKTOP_AGENT_BINARY` | the agent program (empty: `opencode` / `mimo` on PATH) |
| `CODE_DESKTOP_AGENT_RUNNER`, `CODE_DESKTOP_NODE_BINARY` | `node` runner support |
| `CODE_DESKTOP_AGENT_VERSION` | the installed release (reported until the server answers) |
| `CODE_DESKTOP_BRIDGE_STATE` | the bridge's folder (thread index, config overlay, runtime files, `bridge.log`) |
| `CODE_DESKTOP_OPENCODE_FLAVOR` | force `opencode` or `mimo` (otherwise from the binary name / path) |
| `CODE_DESKTOP_OPENCODE_API` | force OpenCode's HTTP API generation, `v1` or `v2` (otherwise `<binary> --version`: 2.x → `v2`; MiMo is always `v1`) |
| `CODE_DESKTOP_PROVIDERS_FILE` + `CODE_DESKTOP_PROVIDER_KEY_<ROUTE>` | custom providers (Settings › Models format) |
| `CODE_DESKTOP_OPENCODE_CONFIG_EXTRA` | JSON merged into the overlay (tests, advanced users) |

## Tests

```
node --test harness/tests/opencode-bridge*.test.mjs
node harness/tests/opencode-bridge-smoke.mjs both --opencode <opencode 1.18.34>   # the 1.x path: real binaries, scripted model, temp homes
node harness/tests/opencode-bridge-smoke.mjs both --opencode <…> --from-packs       # the same, from the assembled packs
CODE_DESKTOP_LIVE_TESTS=1 [CODE_DESKTOP_OPENCODE_V2_BINARY=…] node --test harness/tests/opencode-bridge-v2-live.test.mjs
node harness/tests/opencode-bridge-v2-smoke.mjs [--binary <opencode 2.x>]   # the 2.x parity smoke (real serve, scripted model)
node harness/tests/opencode-v2-live-probe.mjs [--binary …] [--claude]     # PLAN §7.3: what the fake can't tell, as a report
```

The smoke and the probe listen on loopback ports and run the real binary: run them in a normal terminal (not a
sandbox that refuses `listen` / `spawn`). Each file's header says how.

### OpenCode 2.x

OpenCode 2.x moved every route under `/api`, changed the event stream and the `serve` flags. The bridge drives it from
`src/v2/` (`server.js`: `serve --stdio`, Basic auth as `opencode`, `/api/event`; `api.js`: bodies, locations, retries,
paging; `events.js`; `db.js`: its own empty database at `<state>/opencode-v2/opencode.db`, a first-start lock shared with
a workflow runner's bridge, a one-time import of `auth.json` API keys; `threads.js`: the `engine:'v2'` marker;
`config.js`: `OPENCODE_CONFIG=<state>/config-v2/opencode.json` plus `OPENCODE_CONFIG_CONTENT` for `shell`, the plugin and
`experimental` — never `OPENCODE_CONFIG_DIR`, which 2.x reads as a replacement for the user's global config; `plugin.js`:
the `{id, setup}` plugin in `<state>/opencode-plugin/code-desktop/`; `sandbox.js`: the `runtime/shell-v2/<shell>`
wrapper, which reads `$OPENCODE_SESSION_ID`'s `runtime/sandbox/<id>.sb` — a sub-agent's `<id>.root` pointer to its
root's — and fails closed to read-only; a session shell (`!command`) carries no session id and runs read-only).
OpenClaude Desktop's tools name the calling thread from the call's `_meta["ai.opencode/sessionID"]` and the runtime
files (`app/electron/agent-tools-opencode.mjs`, `CODE_DESKTOP_OPENCODE_RUNTIME`), not 1.x's hidden argument, which 2.x's
input decode drops. A user's own `OPENCODE_CONFIG` file is copied into the bridge's (mode 0600, keys written literally
in it included) and re-read at the bridge's next config rewrite only. Threads are read from `/api/session` (2.x's own
cursor behind `oc2:`, never its three-state `archived` filter) and `/api/session/:id/message` (`history.js`: the eleven
message types as 1.x-shaped entries with made-up part ids — `<message>:text:<n>`, `:reasoning:<n>`, `:tool:<call id>`,
`:compaction`, `:shell` — that the live events will produce too; turns grouped by position: a prompt starts one, a
recorded steer joins it, an idle message ends it with its outcome, the user's own `!command` with no turn open is a
turn of its own that ends with it, a run a background sub-agent woke is a turn of its own under the waking message's
id, a staged revert hides its message onward); `projection.js` reads them with `api:'v2'` (the `shell` / `subagent` /
`patch` tools — a background sub-agent settles at its completion message — `FileDiff` changes, error types; an
`execute` call, which the bridge's sessions never make with Code Mode off, is a plain tool row). Models come from
`/api/model`, `/api/model/default` and `/api/provider` (`catalog.js`), agents by id. Turns (`turns.js`, `session.js`):
a thread starts as one `POST /api/session` with its ruleset (`rules.js`: v2's `{action, resource, effect}` and tool
names, `~/.opencode/plan`, the tool-output / shell / skill / reference folders v2 no longer allows itself, Code Mode off
with `execute * deny`, the user's own config denies after the bridge's; a sub-agent's agent limits PATCHed on top),
agent, model and `metadata.codeDesktop.root`; a turn is a prompt id the bridge chose (`POST …/agent` / `…/model` only
when they changed), a `/command` the user item it enqueues (a sub-agent command's turn ends at once), a review 2.2.5's
review prompt sent the same way (`review.js`, no agent switch), a compaction its own id; a steer's item waits for its
delivery; an interrupt also deletes the bridge's undelivered inputs. The live events go through `live.js`, which keeps
each message as v2 projects it and writes it back as the same entries a reload builds; `session.execution.*` start and
end turns (2.x never publishes `session.status` / `session.idle`), and runs nobody here started are external turns
under the same grouping rules. Fork is `POST …/fork {before}`, rewind `…/revert/stage` then `…/revert/commit`, the
side question `…/generate` (one answer, no streaming). After a reconnection each live thread reloads from REST
(messages, running state, pending inbox, open approvals and forms) while its events wait, then applies them; an open
approval or question gets its card once, one no longer open is withdrawn. Approvals (`asks.js`): `permission.asked` is
answered from the root thread's mode as on 1.x (`once`, or a card replied at `…/permission/:id/reply` of the asking
session); policy refusals (read-only edits, nobody to ask) are the plugin's `permission.evaluate`, in-process, because a
v2 reject also rejects the session's other open asks (their `permission.replied` withdraws those cards); Deny with a
note is a reject with it, a plain Deny an interrupt (a reject without a message would end the execution as a shutdown;
if the interrupt itself fails, a reject with a message), the call shown declined; an interrupt or a turn's end
withdraws only that session's cards (a background sub-agent's stay); "Allow for this session" stays the bridge's, in the runtime policy, and a saved `always` rule
from a TUI asks again (the plugin turns an allow the session's ruleset doesn't give back into an ask). Questions are v2
forms (`kind:'question'`: a single choice answers a string); other forms, a dismissed or unattended question are
cancelled with a message. There is no `plan_exit` in 2.x: a Plan-mode turn of the plan agent that succeeded shows its
plan and, after `turn/completed`, the plan card; Approve sets the mode after the plan, switches to the primary agent
(`POST …/agent`, and its model) and queues the execution prompt. Sign-ins (`account.js`) are v2 integrations and
credentials, never `auth.json`: `account/read` reads `GET /api/integration` (`connections[0]` is the one in use; a
`needs_auth` status is listed but not signed in) and `/api/provider` (OpenCode Zen's free tier, config keys); an API key
is `…/connect/key` then the older key deleted; browser and device-code sign-ins are attempts polled every second, methods
by id (ChatGPT by token sharing only, Copilot answering `deploymentType: github.com`); sign-in events become one
debounced `account/updated`. Claude (`claude-agent`) is the user's own Claude Code (`claude.js`: found through the
login shell or the installers' places, handed to serve as `OPENCODE_CLAUDE_PATH` and first on `PATH`; `claude
--version` 2.1.248+ and `claude auth status` are checked before anything is connected, so a missing, old or signed-out
Claude Code is an error with the steps at once); the bridge then connects it, deletes the older connection and waits up
to 120 s for v2's own check (a `needs_auth` status fails it, Claude models with no status succeed: at once when `claude
auth status` said signed in, else after 35 s, as v2 lists its saved Claude models before its check ran). A Claude Code
installed after serve started restarts serve first; while a chat runs, the sign-in is refused until it ends. `ANTHROPIC_API_KEY` /
`_AUTH_TOKEN` / `_BASE_URL` in the environment make Claude Code bill them: reported, not removed. Signing out of Claude
leaves Claude Code signed in (`claude auth logout`). A 1.x core refuses the Claude sign-in naming its program and
version. Extensions (`extensions.js`): `GET /api/config` answers the config documents, never one merged config, so the
bridge folds them (model, `mcp.servers` in 1.x's shape, agents, commands, plugins). Connectors' states come from
`GET /api/mcp` (`needs_client_registration` doesn't exist: a refused client registration is told from the error text; a
connector turned off here shows disabled — the plugin's `mcp.transform` turns it off); reload is
`POST /api/experimental/mcp/:name/connect`; their tools are still listed by `mcp-tools.js` and dropped on
`mcp.status.changed`. A connector's sign-in is its integration (`mcp_<hex>`, one OAuth method of the same id): an attempt
polled like an account's, OpenCode itself taking the browser's redirect (nothing here holds 1.x's port 19876), the
older credentials deleted after it; sign-out deletes its credentials. Skills are listed with their ids (the built-ins'
`opencode` / `report` are not their names): a switch stays by name in `settings.json` and every id seen for that name is
kept (`skillIdsV2`), so the overlay and the session rules deny by both. Commands are `GET /api/command`; an MCP prompt is
`<server>:<prompt>`, a command's file, template and options are read from the config documents and the
`{command,commands}` folders of the directory entries, its hint from the template; `/goal` is not offered (it keeps
prompting the session by itself). Plugins are `GET /api/plugin` per folder (built-ins and the bridge's own left out),
their origin from the config entries; one written for 1.x (no default `{id, setup}`) is marked incompatible, by its
load error or its source; `plugin.updated` rereads the list (a new failure is a notice and `codeDesktop/plugin/changed`),
and an install waits up to 30 s for the plugin's state. Agent files are written in v2's frontmatter (`permissions:`
rules under `shell` / `subagent`, the prompt as the body) and v2's agent list is waited for instead of a dispose. There
is no tool list route: tools/list is a fixed list of 2.2.5's built-ins (no `list`, `lsp`, `codesearch`, `todoread`),
the preview takes the tools the plugin saw. Usage (`usage.js`) is still folded from every session's messages (user and
assistant only, a fork's copies left out, a turn from its prompt to its idle message) and checked against
`GET /api/experimental/session/stats` (a difference is logged, `codeDesktop/diagnostics` `usageCheck`). '{core}
settings': web search is the config `websearch` (on unless turned off, no restart); background sub-agents are always on
in 2.x, so that switch is gone. 2.x has no share links (`codeDesktop/thread/share` is METHOD_NOT_FOUND) and no per-turn
structured output (`turn/start` with `outputSchema` is invalid params); `/cd` (`codeDesktop/thread/move`) is
`POST /api/session/:id/move {directory}`, which moves the session only (the check reports no changes to bring) and
reopens the thread once v2 has it in the new folder; initialize reports the database folder
(`historyLocation: ~/…/state/opencode-v2`, `sessionStore {database:'opencode-v2'}`) over the descriptor's 1.x answers. The 1.x
path stays for MiMo and a user-installed OpenCode 1.x. The v2 tests run against an in-process fake (`tests/fixtures/v2-fake.mjs`) checked against
2.2.5's route contract (`tests/fixtures/v2/openapi-routes.json`, regenerated with `tests/fixtures/v2/make-routes.mjs
<openapi.json> <version>`).
