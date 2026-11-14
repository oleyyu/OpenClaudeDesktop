# OpenClaude Desktop DeepSeek 内核（UI 是 Claude，地核是 DeepSeek）

OpenClaude Desktop（`../app`，还原 Claude Desktop 的 Code 界面）原本通过 `codex app-server --stdio` 驱动 Codex。
本目录把内核换成 **DeepSeek Harness**（`deepseek-ai/deepseek-harness`，MIT，dsh 0.2.0-rc.2）：
一个运行在 Harness 进程内部的 Cordis 插件，对外说 **Codex app-server 协议**，对内调用 Harness 的
agent、会话、流式输出、工具与审批。UI 侧几乎不用改。

```text
OpenClaude Desktop (Electron, Claude UI)
   │  Codex v2 JSON-RPC, 换行分帧, stdio
   ▼
node harness/bin/codex-app-server.mjs app-server --stdio
   │  runProfile(profile/ = dsh-base + @code-desktop/dsh-code-desktop-app)
   ▼
DeepSeek Harness runtime (同进程)
   ├─ @code-desktop/dsh-codex-app-server   ← 本插件（packages/codex-app-server）
   ├─ agents / sessions / persistence (~/.dsh/sessions)
   ├─ tools: bash, read, write, edit, glob, grep, web_*, todo_write, subagent …
   ├─ approval / permission presets / sandbox
   └─ llm: deepseek-official（API key 来自 ~/.dsh/.credentials.yaml）
```

源码位于独立 Git 目录 `../vendor/deepseek-harness`。Workflow 对齐修改由 `scripts/build-workflow-packages.mjs` 构建为内容哈希包，安装到本目录 `node_modules`；其余运行时依赖来自 npm 上的 0.2.0-rc.2。`vendor-packages/workflow-build.json` 记录源码和包哈希。

Lab 的 tool-workflow.inputMode 为 claude-code：仅接收 script、name、description、title、args、scriptPath、resumeFromRunId，统一后台启动。脚本须以字面量 export const meta 开头；description/title 参数被忽略，独立 meta、budgetTotal、workflows 和 run_in_background 会被拒绝。路径优先于名称，名称优先于内联脚本。CLI 的 scriptPath 在本地或 SSH 文件系统中验证单一硬链接、非零文件身份和规范路径，再从已检查的描述符读取；符号链接仍可使用。CLI 文件读取替换无效 UTF-8 字节；注册表跳过不可读和超大条目，错误正文不会覆盖已有可用定义。新运行 ID 使用 wf_ 前缀；恢复保留 runId，每次执行生成 attemptId 并显示为独立历史卡片。显式脚本路径原样保留，编辑后恢复不会改写源文件。模型工具名为 `Workflow`，兼容未公开的 `RunWorkflow` 调用别名；启动返回 `async_launched`、taskId、runId、脚本和转录路径。完成通知直接携带结果，并链接完整输出文件；`TaskStop({task_id})`（也接受旧参数 shell_id）等待任务清理后返回停止确认。手动执行 RPC 支持 attemptId，防止旧句柄操作新的执行。

## 运行

Lab 的 API Key 与账号模型路由默认设置 `retryPolicy: { mode: normal, strategy: claude-code }`，主任务和 Workflow 子任务共享普通请求重试策略。默认最多重试十次；可用 `CLAUDE_CODE_MAX_RETRIES` 设置 0–15 次，或在提供方配置显式设置 `maxRetries`。401 可重试，普通 403 停止；重试保留已完成工具结果与思考签名，取消会中断退避等待。这不代表已复现 Claude 的 OAuth 更新、云账号和 watchdog 特殊分支。

桥接层支持 `assistant/stream-start`／`assistant/stream-merge` 响应记录：分段文本保留原始块编号，消息反馈指向合并后的首条消息，已合并的回复不会被流结束帧清空。实时用量、历史统计与成本估算只累计完整 `assistant/attempt` 的用量，同一响应的多个检查点计作一条回复；usage-cache 版本 4 会重新计算旧缓存。Workflow 会为声明 `streamToolCalls` 的子代理提供方启用流式执行；DeepSeek 在流提前结束时重试一次，再尝试完整 JSON 响应。已接受工具终结后的响应错误会清除结构化返回值，并禁止再次创建子代理。

```sh
npm install            # 首次
npm run start          # 手动跑 stdio 服务（一般由 OpenClaude Desktop 拉起）
node tests/hook-context-smoke.mjs # 安装包的真实 Workflow 子代理、Hook 上下文及超时检查，无需 key
node tests/live-smoke.mjs   # 用 app 自己的 CodexClient 做真机端到端测试（会调用 DeepSeek API）
node tests/fake-model-smoke.mjs   # 同一客户端对真实内核，模型换成本地脚本化的 Messages 服务（DEEPSEEK_BASE_URL），不需要 key 与网络
```

`fake-model-smoke.mjs` 覆盖 developerInstructions、outputSchema、模型的 `Workflow`／`RunWorkflow` 工具（进度、回放、CLI 参数校验、自动结果通知、TaskStop、Dynamic workflows 开关）与 runner agent 的只读/可写权限。内核由 `#!/usr/bin/env node` 启动，CodexClient 会把 `~/.local/bin`、`/usr/local/bin` 放到 PATH 前面：那里的 node 必须 ≥ 22（Harness 要求），否则内核启动即退出。

OpenClaude Desktop 的沙箱实现由自己的 bundle 组装（`packages/code-desktop-app/cordis.patch.yml`）：`sandbox-fs.js`、`sandbox-shell.js`、`sandbox-approval.js` 分别提供文件边界、系统命令沙箱与审批。共享 DSH Purge 依赖保持原样；即使其实现主动绕过 fs/bash/approval，本 profile 仍执行 `thread/start` 的 read-only / workspace-write 限制。`approvalPolicy: never` 拒绝提权；预设应用失败会让请求失败，不能静默沿用较宽权限。测试见 `tests/sandbox.test.mjs` 和 fake smoke 的 write/edit/bash 权限矩阵。

本 profile 为 Bash 启用 `exitCodePolicy: claude-code`：普通非零前台退出触发失败 Hook，`grep` 无匹配、`diff` 差异等退出码 1 保留成功分类。日志与终端卡保留输出和退出码；新结果的展示元数据让 UI 区分语义成功与失败，旧记录仍按原规则显示。后台任务与未知退出码保留 Harness 的处理方式。

OpenClaude Desktop 默认使用本内核（`app/electron/codex.cjs` 的 `resolveCore()`）：

| 环境变量 | 作用 |
|---|---|
| `CODE_DESKTOP_CORE=codex` | 切回 Codex CLI |
| `CODEX_BINARY=<path>` | 显式指定 app-server 可执行文件（UI 测试的假服务器用它，优先级最高） |
| `CODE_DESKTOP_DEEPSEEK_CORE=<script>` | 指定本内核脚本位置 |
| `CODE_DESKTOP_NODE=<node>` | 指定 Node（需 ≥22.19；默认 /opt/homebrew/bin/node） |
| `DSH_HOME` | Harness 主目录（默认 `~/.dsh`，凭据和会话都在这里） |
| `CODE_DESKTOP_PROFILE_DIR` | 内核的 dsh profile 目录，默认 `~/.dsh/code-desktop/profile`（bin/profile.mjs）：首次启动从本仓库的 `profile/` 模板复制 `package.json`、`cordis.yml`、`cordis.patch.yml` 并写 `pnpm-workspace.yaml`，之后只补回缺失的内核 bundle、不覆盖已有文件。用户装的插件（pnpm 依赖与 `dsh.profile.bundles`）和 Settings › Edit config 打开的 `cordis.patch.yml` 都在这里，不写进本仓库。以前直接改过仓库 `profile/cordis.patch.yml` 的，首次启动会被复制过去，之后改新位置 |
| `CODE_DESKTOP_PNPM` | 插件安装用的 pnpm 命令；默认用本安装依赖里的 pnpm 11（`node_modules/pnpm/bin/pnpm.mjs`，由内核自己的 node 运行，dsh-plugin-manager 的 launcher `packageManager`） |
| `CODE_DESKTOP_CORE_STATE` | 桥接层元数据目录，默认 `~/.dsh/code-desktop`：`threads.json`（名称/归档/软删除/子代理 label/lastPromptAt；workflow runner 自己的内核也用它，所以 store.js 每次更新先重读文件、只改自己那一项，不会用旧副本覆盖另一个内核的改名或归档）与 `usage-cache.json`（account/usage/read 的按会话缓存） |

DeepSeek API key：在 DeepSeek Harness（官方 App 或 `dsh web`）里配置一次即可，本内核直接读同一个 `~/.dsh`（也可以设 `DEEPSEEK_API_KEY` 环境变量）。没有 key 时首页显示 "Add your DeepSeek API key" 卡片（Refresh / Get an API key），保存 key 后内核发 `account/updated`，app 自动重读。

## 在 OpenClaude Desktop profile 里加自己的 Cordis 插件

内核的 profile 分层组装，后写的层按 `id` 覆盖前面的行（loader 的 patch 语义：`config` 整体替换，不做深合并）：

```text
profile/cordis.yml ([])
 → dsh-base 的 cordis.patch.yml                     (bundle)
 → packages/code-desktop-app/cordis.patch.yml       (bundle：本桥、启动行、ask-user)
 → profile/cordis.patch.yml                         (app 自带的本地补丁，随仓库走)
 → <userData>/harness/overlay.patch.yml             (Settings › Harness 里做的改动，app 管理)
 → <userData>/harness/user.patch.yml                (你自己的补丁，最后生效)
```

`<userData>` 在 macOS 上是 `~/Library/Application Support/OpenClaude Desktop`（`CODE_DESKTOP_DATA` 可改）。
所有改动都在**下次内核启动**时生效：Settings › Harness › Restart core（或 Developer › Reconnect）。

### 1. 随 app 发布：写进 `profile/cordis.patch.yml`

```yaml
- insert:
    - id: my-plugin                 # 行 id，全 profile 唯一
      name: '@me/dsh-my-plugin'     # 插件模块（包名或路径）
      config:
        greeting: hello
```

`name:` 两种写法都实测可用（`dsh-app-boot` 的 `anchorInsertedPluginNames`）：

- **包名**：把包加进 `harness/package.json` 的 `dependencies`（本地包用 `"@me/dsh-my-plugin": "file:./packages/my-plugin"`，
  和 `@code-desktop/*` 两个包一样），然后在 `harness/` 里 `npm install`。解析从 `harness/package.json` 出发。
- **路径**：绝对路径，或以 `./` / `../` 开头的相对路径，**相对于写它的那个 patch 文件**所在目录，
  被转成 `file://` URL 加载。插件文件里 `import` 的依赖照常按 Node 规则从它自己的位置解析。

### 2. 只给自己用：`user.patch.yml` 和环境变量

Settings › Harness › **Edit profile patch** 会创建 `<userData>/harness/user.patch.yml`（带注释示例）并用默认编辑器打开。
文件必须是 YAML 列表（JSON 也行）；示例里的 `[]` 在加内容时删掉。同一页上的开关、Add server、Skill folders、Hooks
写的是 `overlay.json` → `overlay.patch.yml`，不要手改后者，会被覆盖。

| 环境变量 | 作用 |
|---|---|
| `CODE_DESKTOP_CORE_PATCHES` | 额外 overlay 文件，按 `:` 分隔、按顺序应用；只认绝对路径且文件存在的。app 启动时保留你在环境里给的值，并在其后追加 `overlay.patch.yml`、`user.patch.yml` |
| `CODE_DESKTOP_CORE_SAFE_MODE=1` | 跳过全部 overlay，只用随 app 发布的 profile 启动 |

内核在 stderr 打印 `code-desktop-core: profile overlays applied: …`。overlay 解析失败会让内核起不来：
Settings › Harness 会出现 **Reset overlay** / **Restart without overlay**（后者把偏好 `harnessProfile.overlayEnabled`
设为 false，overlay 和 user patch 都不再传给内核）。

### 3. 最小插件骨架

```js
// my-plugin/index.js  （package.json 里 "type": "module"）
import z from '@deepseek-ai/schemastery'

export const name = 'my-plugin'           // loader 诊断里显示的名字
export const inject = ['tools']           // 需要的服务，到齐后才 apply；不需要就写 []
export const Config = z.object({ greeting: z.string().default('hello') })

export function apply(ctx, config) {
  ctx.logger('my-plugin').info('loaded: %s', config.greeting)
  // ctx.on('agent/request', …) / ctx.get('systemPrompt') / ctx.tools … 用法见
  // node_modules/@deepseek-ai/*/lib/types/*.d.ts 与 ../vendor/deepseek-harness
  ctx.on('dispose', () => {})            // 内核重启或行被禁用时清理
}
```

放在 `harness/` 之外的路径插件解析不到 `@deepseek-ai/schemastery`：要么自己装依赖，要么去掉 `Config` 导出（config 原样传给 `apply`）。
stdout 属于协议，插件只能往 stderr 写诊断。改完 Restart core；在 Settings › Harness › Plugins and bundles 的
“Other plugins” 里能看到这一行和它的状态（`Failed to start` 表示 apply 抛错）。

### 4. 禁用一行

```yaml
- id: tool-web
  disabled: true
```

`disabled: false` 可以重新打开前面某层禁用的行。Settings › Harness 只给安全的行显示开关（工具、MCP client、技能、web search、
hooks、experimental 等）；`codex-app-server`、`code-desktop-startup`、`system-prompt`、`llm-*`、`credentials`、`session-*`、
agent、审批 / 权限行和 app bundle 插入的行显示 “Required”，要动只能写 `user.patch.yml`，后果自负。

## 协议映射

| Codex | DeepSeek Harness |
|---|---|
| thread | session（加载后有 agent）；`thread/list` 来自 `sessionQuery.listSessions()` |
| 会话列表（`thread/list`、不带轮次的 `thread/read`） | 不回放日志（list.js，同官方 App 的 `summarizeCold`）：未在本进程加载的会话只读会话头（`thread/read` 用一次 `sessionPersistence.stat`）和 Harness 的持久投影缓存 `ctx.sessionProjectionCache.cachedSnapshot(header, ['title','sessionListMetadata'])`（`~/.dsh/storages/session_projcache`，与 DeepSeek App 共用）。桥接层在启动时注册上游的 `sessionListMetadata` 投影单元（键、zod schema、fold、stateVersion 1 与 `api/session-controller` 完全相同），所以本进程写的检查点也带这一行。名称 = 桥接层 store 名称 → 缓存 `title` → 仅对本页缓存里没有 title 行的会话调 `readTitleSnapshots`；`updatedAt` = max(createdAt, 缓存 `lastPromptAt`, store 的 `lastPromptAt`（turn/start 时记下）)；缓存标记 `blank`（还没有任何轮次）且没有 store 名称的会话不列出；`searchTerm` 对 name / preview / cwd 做不区分大小写的子串匹配。缓存说不出名称或最近时间的旧会话（本批次之前写的检查点）、没有 store label 的子代理，`thread/read` 照旧回放一次日志，并调用缓存服务的 `coldSnapshot` 写回检查点，下次即零 I/O；日志末尾是 readSession 在内存里补上的 `interrupted` 收尾（另一个进程正在跑的轮次）时不写回（list.js `seedable`）。本进程的缓存表启动时从磁盘读一次（storage-domain 单进程可见），之后别的进程写的检查点看不到，所以 `thread/read` 先比对日志的 revision（list.js `CacheRevisions`：缓存就绪后 `sessionPersistence.list()` 的 revision，之后是本进程回放写回、或卸载自己的线程后 stat 到的 revision），不同就回放一次并写回。`thread/list` 不比对（Tasks 面板每 2 秒轮询，不能逐行回放）。内核启动后的前 5 秒，冷读先等投影注册、缓存服务与这次列表就绪 |
| `updatedAt` / 最近活动 | 已加载的线程与回放：最后一次人类提问、回复或轮次开始/结束（projection.js `lastActivityMs`）；打开会话、切换权限预设、改标题都不算活动。冷行：最后一次人类提问时间（同官方 App）。都不早于 createdAt |
| `thread/unsubscribe` / `thread/close` | 立即应答（unsubscribe 返回 Codex 的 `{status}`：`unsubscribed` 或 `notLoaded`），后台关闭空闲线程：flush、dispose，释放 jsonl 的 `session.lock`，DeepSeek App 即可继续这个会话；运行中、有待处理卡片、inbox 有排队、在压缩、有运行中的子代理（含按谱系找到的任意层级子代理），或它和它的子代理还有没结束的后台 job（`ctx.jobs.list(owner)` 里 running / stopping；bash 的 `run_in_background`、超时转后台的命令）时保持加载：关闭会 dispose agent，dsh-jobs 随之取消它拥有的 job（dev server、测试被杀，完成通知的那一轮也不会发生）。`thread/archive` 同样卸载空闲的已加载线程（app 归档时不发 unsubscribe，自动归档本来就没订阅）。之后的 `turn/start` / `thread/resume` 等先等这次关闭完成再重新打开。app 只在 DeepSeek 内核下、离开一个空闲的已恢复会话时发送（`session-unload-model.mjs`） |
| 会话被另一个进程占用 | `agents.resume` 遇到 `SessionAlreadyOwnedError`（cause 链里任意一层，且本进程没有这个 agent）→ `-32000`，`data: {codexErrorInfo:'sessionBusyElsewhere', threadId}`，"This session is open in another DeepSeek app. Close it there, then try again."（errors.js） |
| turn id | `turn-<该轮第一条用户消息 id>`，无用户消息则 `turn-n<N>` |
| `item/agentMessage/delta`、`item/reasoning/summaryTextDelta` | `agent/assistant-stream` 实时帧（text/reasoning delta；`block-end` 即 item/completed，映射在 `LiveStreamMapper`） |
| assistant 条目 id | `msg-<turn>.<step>.<block>`，实时流与历史回放一致 |
| `commandExecution` | `bash`（terminal 卡片，另带桥接字段 `description`：app 把它按原版 ZD 变成行标题的时态，"Listing files…" / "Listed files…" / "Failed to list files…"；以及桥接字段 `shell`：`'bash'` 或 `'powershell'`，按工具名，`pwsh` → powershell，其余 bash，app 据此把独立卡片标题写成 Bash / PowerShell、提示符 `$` / `>`，没有该字段（Codex）时仍是 Shell 与 `$`）；`read` 用 commandAction read，`read_image` 另带桥接字段 `outputImages`（Codex `{type:'inputImage', imageUrl:'data:<mime>;base64,…'}` 数组，aggregatedOutput 只留描述行，app 显示为 "View screenshot" 缩略图而不是 `[image]`）；`glob`/`grep` 用 search（query = pattern，另带桥接字段 `arguments` = 调用的原始参数，app 的行展开按它列出 pattern:/path:/glob: 等真实输入；以及 `tool` = Harness 工具名，工具组摘要据此把 glob 写成 "found files"、grep 写成 "searched code"）；中止 → `interrupted`，审批被拒 → `declined` |
| `fileChange` | `write`/`edit`（diff 卡片 → 无头 unified diff；新建文件为 add） |
| `webSearch` | `web_search` / `web_fetch` |
| `mcpToolCall` | `mcp__<server>__<tool>`；结果里的图片保留为 MCP ImageContent 块 `{type:'image', data, mimeType}`（app 的 "View screenshot" 缩略图），其他非文本块是 `[<type>]` 文本 |
| `dynamicToolCall` | 其他工具（skill、goal …），`namespace: null`，presenter 的 title 作为桥接字段 `title`。app 对 todo_write（Updated todos / Cleared todos，展开为计划清单）、skill（Ran skill `/name`）、exit_plan_mode（Proposed plan，无展开内容）、ask_user_question（Asked + 首个 header 或 "N questions"）、job_output / job_list / job_kill（Read task output / Listed tasks / Stopped task）、run_code（Ran + description）用原版措辞，其他工具显示 title（"Create goal"），没有 title 才是 "Used <tool>"。结果里的图片成为 `contentItems` 中的 Codex `{type:'inputImage', imageUrl:'data:<mime>;base64,…'}`（文本仍是 `inputText`） |
| 工具结果图片（桥接扩展） | projection.js `toolImages`，只用于 MCP、dynamic 与 read 结果：仅 png / jpeg / gif / webp 栅格图，单张 base64 不超过 `TOOL_IMAGE_LIMIT`（4 MiB 个 base64 字符，约 3 MB 原图）；超出上限、类型未知、文件读不到或调用失败时仍是文本 `[image]`。Harness 的图片块只带附件引用（dsh-tool-fs `read_image`、dsh-mcp-client），每次投影（实时与每次回放：带轮次的 `thread/read`、`thread/resume`）都经 `ctx.attachments.imageHostPath(ref)` 重新读宿主文件并编码，不缓存 base64 |
| `collabAgentToolCall` | `subagent` / `subagent_fork` → `spawnAgent`（prompt、model、reasoningEffort 取自参数，另带桥接字段 `description`）；`send_message` → `sendMessage`、`interrupt_agent` → `interruptAgent`、`list_agents` → `listAgents`。子会话 id 来自父会话的 `subagent/catalog`（按 label = 调用的 description 匹配仍在运行的委派；无 label 时只认唯一一个）或可续结果 `started subagent <id>`：可续子代理返回后行为 completed、`agentsStates[child]` 为 running；前台（一次性）运行的输出就是该子代理的 message（completed / errored，被取消为 interrupted）。父会话收到的 `subagent-settled` 通知（"Background subagent … finished/was stopped/failed…"）不生成用户气泡：更新原委派行的 `agentsStates[child] = {status, message: 结束语}` 并以它自己的 turnId 再发一次 item/completed，同时在当前轮放一条不可见的 `subAgentActivity`（completed / interrupted）；子代理发给父会话的 `agent-message` 只记一条 `interacted` 活动。这些活动条目不决定轮次 id（之后的人类消息仍决定） |
| 子代理线程 | Harness 会话头 `origin: 'subagent'` → `parentThreadId = parentSession`、`source: {subAgent: {thread_spawn: {parent_thread_id, depth: delegationDepth, agent_path: null, agent_nickname, agent_role: null}}}`、`agentNickname` = 委派 label（桥接层 store 的 `agentLabel`，或子会话自己的 `subagent/descriptor`）；有 parentSession 但不是子代理的是用户自己的 fork → `forkedFromId`，照常出现在会话列表。`thread/list` 的 `sourceKinds` 里任何 `subAgent*` 只列子代理，其他值或不传只列交互会话；行来自投影缓存（见"会话列表"），`readTitleSnapshots` 只为返回的那一页里缓存没有 title 行的会话调用。`subagent/start`（子代理常驻：创建、唤醒或冷恢复）时，若它（任意层级）属于某个已加载的根线程：发 `thread/started`（子线程对象）和 `thread/status/changed` active，并把它的持久事件按子线程 id 实时投影（轮次与条目，像 Codex 的 spawned thread；不转发 token 级增量），已经开始的轮次补发 `turn/started`，这样 Tasks 面板能拿到轮次 id 去 Stop；`subagent/end` → idle。不在本进程运行的子代理状态为 idle。子代理 fork（`subagent_fork`）的日志以父会话历史开头：投影在最后一个 `session/end-seed {inherited:true}` 处清空，只显示子代理自己的轮次；用户 fork 仍显示复制来的历史 |
| 子代理 Stop | `turn/interrupt` 的 threadId 不是根线程时视为子代理：撤掉它挂在根线程上的审批卡片，`agents.get(id).cancel({kind:'user'}, {keepInbox:true})`（与 DeepSeek App 自己的停止相同）；可续子代理随后以 "was stopped" 通知结束，委派行显示 Stopped |
| 子代理审批（Ask 模式） | Harness 把子代理的审批策略钉在 `never`（返回 ask 会被自动拒绝），所以桥接层在子代理的 `tools/pre-execute` 里沿 parentSession 链找到根线程（approval.js `rootThreadFor`，最多 8 层）；根线程为 `untrusted` 且工具会改动东西（不在只读表里；子代理的 `send_message` / `interrupt_agent` 也不问）时，直接在根线程上弹卡片（`childApproval`）：threadId = 根线程，itemId = 子代理自己的调用 id（根线程里没有这一行，卡片按命令或 `changes` 显示真实内容，而不是父会话的 "run an agent"），reason = "Requested by the “<label>” agent."，写入走 fileChange 审批并带桥接字段 `changes`（diff）；"Allow for this session" 记在根线程的授权里；结果按 Harness 自己的措辞返回 allow / deny（`the user rejected tool "<name>"`），子代理的轮次被中止则为 cancel |
| `turn/plan/updated` | `todo_write` / `todo/write` |
| `Turn.error` / `error` | turn/end `{kind:'error'}` 与 `agent/error` 的 LlmFailure → `codexErrorInfo`（projection.js `codexErrorInfoOf`）：AUTH / INVALID_CREDENTIAL / MISSING_CREDENTIAL → unauthorized，RATE_LIMIT → rateLimitExceeded，SERVER → 503/529 serverOverloaded、其余 internalServerError，TRANSPORT / TIMEOUT → `{responseStreamConnectionFailed: {httpStatusCode}}`，CONTEXT_WINDOW_EXCEEDED → contextWindowExceeded，INVALID_REQUEST → badRequest，QUOTA / ACCOUNT_QUOTA → usageLimitExceeded，其他 code 为 null；`additionalDetails` 保留原始 code（与 message 相同时省略），app 据此显示 "Billing issue"（余额不足，不提供重试）与 "Check your DeepSeek API key in DeepSeek Harness settings."。`llm/retry` → `error {willRetry:true}`，另带桥接字段 `retry: {attempt, maxRetries}`（always 策略 maxRetries 为 null），状态行显示 "Rate limited · Retrying (1/5)"。`max-tokens` 结束的轮次仍算 completed，不带错误 |
| `item/*/requestApproval` | `approval/request` 钩子（approval.js；Harness 只有允许一次/拒绝）。来源：Ask 模式下桥接层自己的 pre-execute ask（记下 callId），其余都是 Harness 沙箱提权（`escalate sandbox to <mode>`）。reason 只用英文 displayReason，去掉 "Allow this operation with <mode> permissions:" 前缀，写成 `Needs <mode>: <理由>`；Ask 模式的 ask 不带 reason。卡片额外带 `sessionGrantable`（Codex 客户端忽略）：提权到 danger-full-access（或模式不明）的文件写入为 false，app 隐藏 "Allow for this session"。非 bash 工具仍走 commandExecution 审批（command 为 `<工具名> <JSON>`），app 按条目生成标题（run + 描述、run an agent、run skill /name、fetch、search the web、use tool (server)、use tool + 参数 JSON）。Plan 模式下直接 `rejected`，不弹审批 |
| "Allow for this session" | 桥接层内存里的授权键：Ask 模式 `ask:file`（所有 write/edit）、`ask:command:<命令原文>`、`ask:tool:<工具名>`（同一工具不论参数，对应原版按工具的 "Don’t ask again"）；提权 `escalate:<mode>:command:<工作目录>\0<命令>`（同一命令换个工作目录就是另一次授权）/ `escalate:<mode>:file:<排序后的路径>` / `escalate:<mode>:tool:<工具名>`。Ask 授权永远不会放行提权；有效 preset 变化（如 Auto → Plan → Auto）时清掉所有 `escalate:` 授权。授权按线程 id 记在内核进程里（`grantsById`），离开会话（unsubscribe 卸载）再回来仍有效，`thread/delete` 时丢弃 |
| 额外工作目录 | turn/start 的 `sandboxPolicy.writableRoots`（app 发 cwd + "Add folder" / `/add-dir` 的目录）去掉 cwd 后 realpath，存为 `thread.permission.extraRoots`；其他沙箱模式清空。Harness workspace-write 只认 cwd，所以写入这些目录会先被沙箱拒绝、模型带 `sandbox_permissions` 重试；这次文件提权直接 `allowed-once`、不弹卡片，条件是：请求是能识别的沙箱提权（`escalate sandbox to <mode>`，其他插件显式的 ask 照常弹卡片）；判断用 write/edit 调用自己的 `file_path`，而不是投影后的条目路径（投影按文本把相对路径解析到 cwd，会吃掉 `..`）；`file_path` 不含 `..` 段（Harness 的 dsh-fs-local 按文件系统解析 `link/..`，会先跟随符号链接再上跳，含 `..` 一律弹卡片）；条目正好描述这一个文件；解析方式同 dsh-fs-local（拼写路径 realpath，不存在时取最深存在祖先 realpath + 其余部分）后落在 extraRoots 内，所以指向外部的符号链接不算。bash 提权照常询问 |
| `item/tool/requestUserInput` | `user-questions/request` 钩子（questions.js）：`ask_user_question`（`dsh-tool-ask-user`，legacy 阻塞模式，在 `packages/code-desktop-app/cordis.patch.yml` 挂载）与 `exit_plan_mode` 的计划评审。问题 → `{id, header ?? '', question（有 detail 时拼在后面，plan-review 除外）, isOther:true, isSecret:false, options:[{label, description ?? ''}] ?? null, multiSelect}`（`multiSelect` 是桥接扩展字段，取自 ask_user_question 的 multi_select；app 据此画复选框、可多选，Codex 客户端忽略），`isBlocking:true`；回答里等于选项 label 的进 `selected`（多选时全部进），其余文字进 `custom`；`itemId` = intent.callId / wait.callId / 本轮最早一个仍在运行且未在提问的 ask_user_question/exit_plan_mode；等待中线程状态带 `waitingOnUserInput`；中止/断开 → `serverRequest/resolved` + `UserQuestionError`（`ASK_ABORTED` / `ASK_CANCELLED`） |
| Auto / Ask / Accept edits / Plan / Bypass | 预设 workspace-write / workspace-write + 逐次询问（tools/pre-execute ask）/ 同 Ask，但模式提示为 `acceptEdits` 时 `write` / `edit` 的 `file_path` 落在工作区（cwd 或额外工作目录，realpath 后、不含 `..`，软链接出去的仍询问）内直接放行（approval.js `acceptsEdit` / `preExecuteDecision`；子代理的编辑按根线程工作区判断），bash 与其他会改动东西的工具照旧询问 / read-only + Harness plan mode / danger-full-access |
| Plan 模式 | 只读沙箱分不清 Plan、chat、review，所以 app（仅 DeepSeek 内核）在 thread/start、thread/resume、turn/start 上额外带 `codeDesktop: {permissionMode, afterPlan}`（permission-policy.mjs；Codex 收不到）。有该提示时桥接层每次都 `planMode.set(agent, mode === 'plan')`（会话日志里的 plan mode 会跨内核重启保留，set 对相同状态是 no-op，运行中的轮次从下一步生效）：Plan 带上 Harness 的计划指引并允许 `exit_plan_mode`，其他模式关掉它；没有提示时不碰 plan mode。Plan 中沙箱提权一律拒绝。`exit_plan_mode` 的计划先投影成 Codex `plan` 条目（`plan-<callId>`，Markdown），评审走问题卡（"Plan review"：Approve / Keep planning / 自填反馈）。选 Approve：本轮余下部分改用 afterPlan（Ask / Accept edits → untrusted 并保留该模式，其他 → on-request，Bypass 降为 Auto）+ workspace-write，Harness 自己退出 plan mode；app 同时把权限切回同一个模式，下一轮不会再以 Plan 发出 |
| model / effort | `ctx.llm` 目录（models.js）；默认模型 `deepseek-flash`（`packages/code-desktop-app/cordis.patch.yml` 与 Config 默认值，目录里的真实 id）；`description` 只取目录自带的描述（deepseek-flash 没有，菜单就不显示说明行），`inputModalities` 取 `resolveModelInfo` 的路由信息（没有时取列表），app 据此决定能否附图；effort 原样透传（off/low/high/max，app 显示首字母大写） |
| 用户输入（`turn/start`、`turn/steer`、`thread/queue/add`、`thread/queue/update`） | input.js `toHarnessContent`：text → 文本块；`localImage` → 读文件、按文件头判定 png/jpeg/gif/webp、整条消息的图片一次 `ctx.attachments.saveImages(batch)`（按顺序），原位放 Harness 图片块 `{type:'image', attachment}`，模型直接看图（不再需要 read_image）；线程当前路由的 `inputModalities` 没有 `image`（如 deepseek-v4-pro）→ `-32602` `Model "<名称>" does not support image input.`，什么都不写入；附件存储的大小/像素/数量限制同样是 `-32602`；没有挂载附件存储时才退回文本 `[Attached image: P — use read_image to view it]`。`mention` → `[Referenced: P]`；`skill` → `/name`（dsh-tool-skill 的 SKILL_GESTURE：这一步注入技能正文），名字不符合技能名语法时 `[Use the N skill (P)]`；图片 URL → `[Attached image URL: U]`。反向（实时 item、回放、重启后的排队输入）`toCodexInputs`：整块文本正好是某个方括号格式的才还原成 `mention` / `skill` / `localImage` / `image` 部件（句子里提到的照旧是文本），图片块 → `localImage`，路径为 `attachments.imageHostPath(ref)`（`~/.dsh/attachments/v1/objects/…` 规范化后的副本），`/name` 照原样是文本；预览只用用户输入的文本，不含任何标记 |
| `thread/tokenUsage/updated` | assistant usage 累计；`last.totalTokens` = tokenMeter 实测上下文；窗口来自 requestContext；`thread/resume` 响应后回放一次（计划同理回放 `turn/plan/updated`） |
| `thread/compact/start` | `/compact` 命令（`commands.execute(agent,'/compact',[],signal)`，Harness 维护任务，不占模型轮次）；`compaction/start…end`（`turn:null`）投影成合成轮 `turn-c<compactionId>`（含 `contextCompaction` 条目，回放一致）；没开始压缩（无可压缩历史、忙、出错）则发一个空的 `turn-compact-<uuid>` 轮；`turn/interrupt` 中止 → `interrupted`；运行中线程状态为 active，`turn/steer` 返回 `activeTurnNotSteerable` |
| `thread/queue/*` | agent 的持久 inbox（`next-turn`）：add = `agent.followup`（空闲时直接开始），list = `inbox.nextTurn`（原始 Codex input 与 clientUserMessageId 按消息 id 记在内存，重启后由消息内容重建），delete/update/reorder = `inbox.remove/replace/splice`，start = 运行中转 steer、空闲时唤醒；`agent/inbox/*` 事件 → `thread/queue/changed`（同一 tick 合并）；`turn/interrupt` 有排队时 `keepInbox`、丢弃 steer，空闲后接着跑队列 |
| `account/read` | account.js `accountReadResponse`：`ctx.credentials.describe(credentialRef('DEEPSEEK_API_KEY'))`（只有 configured/source，不碰值）与 `ctx.deepseekAccount.getState()`。key 能解析或已登录 DeepSeek Platform（`credential-stored`）→ `{account: {type:'apiKey'}}`，否则 `account: null`；`requiresOpenaiAuth` 永远 false（本内核没有 ChatGPT 登录）。桥接扩展 `deepseek: {apiKey: {configured, source}, platform, links}`（source 为 Harness 的来源层：`file` = `~/.dsh/.credentials.yaml`、`env`、`project-env`、`user-env`）：app 据此显示 "DeepSeek API key" 行（来源说明、Refresh、Manage keys → platform.deepseek.com/api_keys，没有 Sign out / ChatGPT 登录）和首页的加 key 卡片，账户菜单写 "DeepSeek API · API key"。Harness 无论有没有 key 都注册 DeepSeek provider，所以不再看 `listProviders()`（只在没有 credentials 服务时退回它）。`credentials/reference-updated`、`credentials/record-updated`、`deepseek-account/signed-out` → `account/updated`。`account/login/*`、`account/logout` 仍是 `-32601`（在 DeepSeek Harness 里管理 key） |
| `account/usage/read` | usage.js：`sessionQuery.listSessions()` 列出的全部 Harness 会话（同一 DSH_HOME，DeepSeek Harness App 的会话也算；桥接层软删除的跳过）逐个折叠：每条 `assistant/message` 的 `usage.inputTokens + usage.outputTokens`（Harness 的 inputTokens 只是未命中缓存的输入，前缀缓存读写不计入，与原版 input + output 相同）按事件本地日期分桶；`turn/start → turn/end` 最长耗时为 `longestRunningTurnSec`；fork 只算最后一个 `session/end-seed {inherited:true}` 之后的事件。返回 Codex `{summary: {lifetimeTokens, peakDailyTokens, longestRunningTurnSec, currentStreakDays, longestStreakDays}, dailyUsageBuckets: [{startDate, tokens}]（升序）, threadUsage: null}`，Codex 字段全部是安全整数；连续天数同原版（当前连续从今天往回数，今天没有用量为 0）。另带桥接扩展 `deepseek`（usage.js `foldSessionBilling` / `deepseekUsage` + `pricing.js`）：每条 `assistant/message` 按本地日期、`source.model`、峰谷时段（北京时间周一至周五 09–12、14–18 为高峰，不计法定节假日）和类别（inputTokens=未命中、cacheReadTokens=命中、cacheWriteTokens 按未命中计费、outputTokens 含推理）记 token，按 DeepSeek 官方人民币价估算：`{currency:'CNY', pricingUrl, allTime, last30Days, today, models:[{model, displayName, …}], daily:[{date, …}]}`，每项 totals 为 `{tokens（四类之和）, inputTokens, cacheReadTokens, cacheWriteTokens, outputTokens, peakTokens, unpricedTokens, costCny, inputCostCny, cacheReadCostCny, outputCostCny}`；旧 id deepseek-v4-flash / -vision-exp 按 deepseek-flash 计价，未知模型只计 token、费用为 null。缓存 version 3（加 `billing` 折叠，旧文件重新折叠一次）。本进程的线程直接用内存事件；其余按 `sessionPersistence.list()` 的 revision 缓存（内存 + `usage-cache.json`，换时区作废），只重读变化的日志，最多 4 个并发；读不了的日志跳过（同一 revision 不再重试）。并发请求共用一次折叠。`account/rateLimits/read` 仍全为 null（DeepSeek 按 token 计费；有 `deepseek` 时 Usage 页显示总量/近 30 天/今天的 token 与 ≈¥、费用构成、分模型和每日列表，否则仍是 "DeepSeek bills per token; there are no plan usage limits." 和每日 token 表） |
| `initialize` | 额外返回 `engine: 'deepseek-harness'`、`engineVersion`、`capabilities`（`CAPABILITIES`，index.js）与 `configPath`（`ctx.configEditor.documentPath`，即桥接层自己的 profile 补丁 `profile/cordis.patch.yml`）。`capabilities.unsupportedMethods` 列出本内核必然失败的 Codex 请求（`review/start`、`thread/revert`；`thread/fork` 与 `thread/backgroundTerminals/*` 已实现，见 fork.js、jobs.js）；`skillToggle: false`（没有逐技能开关）、`mcpConfigWrite: false`（不写 MCP 配置）、`livePermissions: true`（支持下面的 `codeDesktop/thread/permissions`）、`codeStats: true`（支持下面的 `codeDesktop/stats/read`）、`coreCommands: true`（`codeDesktop/commands/list` / `execute` 提供内核自己的斜杠命令，commands.js；execute 必须带 turn/start 的权限参数并先应用它们）、`sideQuestion: true`（`codeDesktop/sideQuestion` 回答 /btw，side-question.js）。app 的 `main.cjs connect()` 把它们存为 `boot.core = {engine, engineVersion, capabilities, configPath}`；没有 engine 的服务器（Codex、UI 测试假服务器）一律按 `engine: 'codex'` 处理，保留全部控件 |
| `codeDesktop/thread/permissions`（桥接扩展） | 运行中切换 Mode（OpenClaude Desktop F05：Mode/Model/Effort 在轮次进行中保持可用，源码 c360a9e1c Ud）：参数与 turn/start 的权限参数相同（approvalPolicy、sandboxPolicy、`codeDesktop` 提示），对本进程已加载的线程立即 `applyPermissions`——预设马上切换（之后的工具调用按新模式询问或放行，Ask 的 pre-execute 读的是 `thread.permission.approvalPolicy`），plan mode 从下一步生效；未加载的线程返回 `{applied:false}`，它的下一次 turn/start 或 thread/resume 本来就带新模式。app 只在 `capabilities.livePermissions` 为真且轮次进行中时发送；main.cjs 白名单放行并像 turn/start 一样校验 bypass。Codex 没有对应请求，所以 Codex 内核下模式从下一次 turn/start 起生效 |
| `codeDesktop/stats/read`（桥接扩展） | 首页统计卡（OpenClaude Desktop F09，原版 cc43287c9 `$O` getCodeStats → code-home.js Iw/Xw/eT/cT）：与 `account/usage/read` 共用同一次逐会话折叠和 `usage-cache.json`（缓存 version 2，旧文件重新折叠一次），fork 同样只算最后一个 `session/end-seed {inherited:true}` 之后。usage.js `foldSessionStats` 按事件本地日期记：sessions（会话第一条人类 `user/message` 那天 +1；子代理会话 `header.origin === 'subagent'` 的委派 prompt 也是 `source.kind: 'user'`，由 index.js 在折叠缓存之外标记 `subagent`，`codeStats` 不计其会话，但计消息、工具调用与 token，与 thread/list 不列子代理一致）、messages（人类 `user/message` + `assistant/message`）、toolCalls（`tool/call`）、按本地小时的消息直方图、按 `assistant/message.data.message.source.model` 的未缓存输入 + 输出 token；每个模型累计 input/output/cacheRead/cacheWrite。返回原版形状 `{dailyActivity: [{date, messageCount, sessionCount, toolCallCount}], dailyModelTokens: [{date, tokensByModel}], modelUsage: {[model]: {inputTokens, outputTokens, cacheReadInputTokens, cacheCreationInputTokens}}, peakActivityHour}`（日期升序，只列有活动的日子；peakActivityHour 为全时段最忙的本地小时，没有则 null）。app 只在 `capabilities.codeStats` 为真时调用，并把上次结果存进 config 以便下次启动立即显示；Codex 内核用 app 自己的 activity 账本兜底 |
| `skills/list` | 每个 cwd 调 `ctx.skills.snapshot({cwd})`（catalog.js `skillsListEntry`）：SkillSummary → SkillMetadata，`scope` 按来源（`project-*` → repo，`user-*`/`custom` → user，bundled/runtime → system），`enabled` = `invocation.modelInvocable`（Codex 兼容），另带 `userInvocable` / `modelInvocable`（完整调用策略：`disable-model-invocation: true` 的技能只能 /name 调用，`user-invocable: false` 的只由模型调用；Codex 客户端忽略这两个字段，app 据此决定 '/' 与 Add › Skills 是否列出、Customize 的 Trigger 事实），SKILL.md `metadata.version` 存在时带 `version`，`pluginId: null`；没有路径的虚拟技能、两种调用都被禁止的技能不列出；`complete: false` 时加一条 `{path: cwd, message: 'Some skill sources could not be read.'}`。根目录：`<project>/.dsh/skills`、`<project>/.agents/skills`、`~/.dsh/skills`、`~/.agents/skills` 及内置技能。Harness 的 `skills/change` → `skills/changed`（app 防抖重读）。`skills/config/write` → `-32601`，提示在 SKILL.md frontmatter 加 `disable-model-invocation: true`（errors.js `skillToggleUnsupported`）；app 在 DeepSeek 内核上不画 Enable skill 开关与 Disabled 徽标（原版 cfaabd194 `Ce` / customize-skills :3130 都以可切换为前提） |
| `config/read` | `{config: {sandbox_mode, approval_policy, mcp_servers}, origins: {}, layers: null}`（catalog.js `configReadResponse`）：权限取 `params.cwd` 下最近活动的已加载线程（`latestThreadIn`），否则默认 workspace-write / on-request。`mcp_servers` 每个 `@deepseek-ai/dsh-mcp-client` 条目一张表（键 = `serverName`）：command、args、url、cwd、`enabled`，`env` / `headers` 只给键名（值一律 `''`，密钥不出内核）。app 的沙箱行说明为 "Set per session with the Mode menu (DeepSeek Harness permission presets)." |
| `mcpServerStatus/list` | profile 里每个 MCP client 条目（`ctx.configEditor.entries()`）一行（catalog.js `mcpServerStatuses`）：`runtimeStatus` 由条目决定，disabled → `disabled`，fiber active → `connected`，pending/loading → `starting`，failed → `failed`，其余 null；`tools` 来自 `ctx.tools.schemas()` 中 `mcp__<server>__` 前缀的工具，键为原始工具名；`authStatus: 'unsupported'`、`resources: []`、`serverInfo: null`。`config/mcpServer/reload`（Reconnect）重启每个在运行的 MCP client fiber（`fiber.restart()`，用当前配置重连），从未启动的 `entry.refresh()`。`config/batchWrite`、`mcpServer/oauth/login` 仍不支持：app 在 `mcpConfigWrite: false` 时隐藏 "Add custom connector"/"Remove connector"/Developer 的 Delete，改为提示 "Add a @deepseek-ai/dsh-mcp-client entry to <configPath>, then Reconnect" 并给 Edit config 按钮（打开 `configPath`，settings-pages.cjs `editConfigTarget`） |
| `plugin/installed` / `plugin/read` | `ctx.pluginManager.listBundles()` → 一个本地 marketplace `deepseek-harness`（`path` = profile 目录，显示名 "DeepSeek Harness profile"），每个 bundle 一个 PluginSummary（`installed: true`，`enabled` = 是否被 profile 选中，显示名 = meta.title 或包名，简介 = package description）；没有 pluginManager 时为空目录而不是错误。`plugin/read` 返回该 bundle 的描述与它插入的 MCP client 行的 serverName（`mcpServers`），技能与 hooks 不归属到 bundle（空） |
| `thread/start` `developerInstructions` | structured.js：线程 agent 作用域里的一个 system prompt 段（`code-desktop:developer-instructions`，紧跟部署人格前缀，不做 `{{}}` 插值）；同时存进桥接元数据 `threads.json`，`thread/resume` 打开时重新挂上。workflow runner 的 agentType（`.claude/agents`）系统提示走这里 |
| `turn/start` `outputSchema` | structured.js：只对这一轮在 agent 作用域里注册 `structured_output` 捕获工具（参数 schema 即 outputSchema，执行时 `validateJsonSchemaValue` 校验、`concludeTurn()` 结束本轮）、`STRUCTURED_OUTPUT` 说明段与"已捕获后拒绝其他工具"的 guard——与 Harness 一次性子代理（dsh-subagent-in-process-driver）同一机制。被接受的参数在 projection.js 里成为本轮最后一条 agentMessage（JSON 文本），不显示为工具行；被拒的调用（不符合 schema）不显示，模型会重试。agent 正在跑时等这一轮的 user/message 落地才挂，`turn/end` 时卸下。schema 必须是对象根且在 `assertObjectJsonSchema` 支持的子集内，否则 `-32602`（runner 的 agent 得到 null）。`capabilities.structuredOutput` |
| 模型的 `Workflow` 工具（兼容 `RunWorkflow` 与旧记录 `workflow`） | workflows.js：工具调用仍是 dynamicToolCall，另带桥接字段 `workflowRun`——即 app 自己的运行形状（`workflow_phase` / `workflow_agent`，workflow-progress-model.mjs），所以转录行与 Tasks 卡片和 /workflow 的一样。`tool/call` 时为 running 并列出 meta.phases；持久记录 `tool-workflow/run-start`（执行 attemptId 取代 `call-<callId>`，runId 保留用于恢复）、`agent-start/end`（成员与其 phase、childId、结果）、`run-end`（completed/stopped/failed）随会话日志实时到达，也随回放重建；`workflow/phase` 只是引擎的实时事件（不落盘），按 run id 送到记录了该运行的线程，记录到达前的先缓存。前台失败用工具的错误文本收尾；新模型调用统一后台运行，从受理文本里取 taskId／jobId，工具返回后运行继续。更新以不带生命周期时间的 item/started / item/completed 重发。轮次被停止时运行与其中的 agent 记为 stopped |
| 插件管理（桥接扩展，plugins.js） | profile 里的 dsh-plugin-manager（DeepSeek App 的 Plugins 页与 `dsh plugin` 用的同一服务）：`codeDesktop/plugin/inspect {spec}`（安装前读包：npm 名、绝对路径、git 地址或 tarball；不是 bundle → `not-a-bundle`）、`install {spec, requestId?, approvedBuilds?, registry?}`（pnpm add，按 registry 列表回退；`approvedBuilds` 是用户在"Allow these scripts and retry"里批准的、上次失败报告的 pendingBuilds）、`cancelInstall {requestId}`、`setEnabled {pluginName, enabled}`（`dsh.profile.bundles` 选择）、`remove {pluginName}`；返回 ChangeResult（`application` 为 applied / restart-required / failed / cancelled）。以 `-` 开头的 spec 一律拒绝（不让它变成 pnpm 选项）。通知：`codeDesktop/plugin/installProgress`（install-state）、`installLog`（该 request 的 pnpm 输出，每块 ≤16 KB）、`changed`（并发 `skills/changed`）。`plugin/installed` 每行带桥接字段 `codeDesktop: {removable, optional, readOnlyReason, loadError}`。本 profile 关了 HMR，所以变更是 restart-required：app 显示"Restart DeepSeek"（即 Reconnect，重启内核）。`capabilities.pluginManage` 在 profile 有 pluginManager 时为真 |
| `codeDesktop/workflow/stop`（桥接扩展） | `{threadId, runId}`：后台运行 `jobs.kill(jobId, threadId)`；前台运行就是正在执行的工具调用，所以与 `turn/interrupt` 一样停止本轮（工具把步骤的 abort signal 接到 `run.cancel()`）；已结束返回 `{status:'alreadyFinished'}`。`capabilities.modelWorkflows`；main.cjs 白名单放行并校验 threadId |
| Dynamic workflows 开关 | 每个线程默认对模型隐藏已注册的 Workflow 工具及其 RunWorkflow 别名（按实际注册名称施加作用域限制，并遮住对应工具提示），只有请求带 `codeDesktop.dynamicWorkflows: true` 才放出、带 false 再收回（structured.js `workflowsAllowedBy` / `hideWorkflowTool`）。main.cjs 在 DeepSeek 模式的 thread/start、thread/resume、turn/start、`codeDesktop/thread/permissions` 上按设置盖这个值；workflow runner 自己的线程不带，所以不会嵌套工作流 |
| 未知 thread id | `thread/read`、`thread/resume`、`turn/start` 等遇到 Harness 不认识的会话（`SESSION_QUERY_SESSION_NOT_FOUND` / `SessionPersistenceNotFoundError`，含 cause 链，或 stat 无 header）→ `-32602`，`data: {codexErrorInfo:'threadNotFound', threadId}`（errors.js；`threadNotFound` 是本桥接层的扩展值，Codex 的 CodexErrorInfo 没有它）。RpcError 不打 stderr 堆栈；`thread/unarchive` 对未知 id 也返回该错误，app 不会把它挪回活动列表 |

### 自定义指令与系统提示（Custom instructions = system prompt）

Settings → Instructions（C1）。偏好键 `customInstructions = {enabled, global, projects: {[绝对路径]: {text, useFile}}}`（app/electron/prefs/instructions.mjs，纯模块，**不限长度**，≤64 个项目）。

- **全局指令就是整个系统提示（DeepSeek 内核）**：`global` 非空（且 `enabled`）时，发给模型的系统提示 = 全局指令原文（只去首尾空白，`{{model}}` / `{{provider}}` / `{{cwd}}` 等有值的提示变量会被替换，其它 `{{…}}` 原样保留，绝不因此让一轮失败），后面接项目指令（若有）。Harness 的默认段（`harness:identity`、`deployment:persona-prefix/suffix`、各工具指引 `tool:*`、harness source、web surface 等）**全部不发**。`global` 为空或开关关掉时，用内置默认提示（新用户照常可用）。
- **组合**（app/electron/instructions-service.cjs `composeInstructions`）：返回 `systemPrompt`（全局文本或 null）和 `instructions`（项目文本：`.code-desktop/instructions.md` + 设置里的项目覆盖，空行连接；有自定义系统提示时是裸文本，用内置提示时带 `# Project instructions (<项目根>)` 标题）。项目条目取 cwd 本身或其最近父目录中路径最长的键；项目文件是从 cwd 向上（≤8 层，不读 `$HOME` 与 `/`）最近的 `.code-desktop/instructions.md`，每次请求现读、不设上限，HTML 注释（新建文件的模板）不计入。
- **传输**：main.cjs 在 `thread/start`、`thread/resume`、`turn/start` 上写 `params.codeDesktop.customization = {systemPrompt, instructions}`（各为字符串或 null；键缺省保留旧值，null 清除），所以对新会话、已打开和恢复的会话都从下一条消息起生效。
- **桥接**（customization.js → system-prompt.js `installSystemPrompt`）：在每个 Agent 的 setup（与 installModelSelection 同处）注册 **agent 作用域**的 `system-prompt/assemble` 瀑布监听（`prepend`，先 `await next()` 再改，作用域过滤保证只影响这个 Agent）。`ref.systemPrompt` 有值时把 `assembly.sections` 换成一段 `code-desktop:system-prompt`（`interpolate: false`，变量已由 `interpolateLoose` 替换），只保留会话自己的输入段（按原顺序）：`code-desktop:custom-instructions`（项目指令，instructions.js）、`code-desktop:developer-instructions` 与 `tool:structured_output`（后两者只在 workflow agent / outputSchema 轮次存在）。`assembly.tools` 不动——工具仍以 API tool schema 发送；运行时上下文快照（沙箱/审批策略，"Current runtime context…"）是 user 角色消息，不属于系统提示，也保留。Harness 在瀑布之后唯一会改段落的机制是 `complete: true` 段（只有 skill / session-query 等子 Agent 作用域会注册），主线程没有。子代理有自己的作用域，继续用内置提示。
- **预览 RPC** `codeDesktop/systemPrompt/preview {cwd, threadId?, model?, codeDesktop.customization}` → `{text, defaultText, defaultTemplate, custom, exact, sections:[{name, chars}], tools:[name], variables:{provider, model, cwd}, cwd, threadId}`（`initialize` 的 capabilities 带 `systemPromptPreview: true`）。有已加载线程（`threadId`，否则同 cwd 的任一已加载线程）时，用该 Agent 的真实组装（`assembleContextFor(agent)` 加上 `codeDesktopCustom` 字段，监听器与项目指令段都优先读它，所以预览用 app 当前的值而不改线程），`exact: true`。没有线程时用全局层组装、补上路由的 provider/model 与 cwd 变量，再套同一个替换函数，`exact: false`——此时少了运行中会话才有的 agent 作用域段（plan 模式策略、workflow 的开发者指令；`workflow` 工具指引在线程里会被隐藏，所以全局预览的默认文本略长）。`defaultText` 是不带任何自定义的内置提示；`defaultTemplate` 是同一文本但变量保留为 `{{name}}`，给 “Start from built-in default” 填进编辑框。
- **设置页**：Global instructions 文本框（不限长，说明 “This is the whole system prompt. Leave empty to use the built-in default.”）、**Start from built-in default**（把 `defaultTemplate` 填入编辑框，未保存）、**Reset**（清空 = 回到内置提示）；设了自定义提示时显示警告：内置的工具指引也被替换，工具仍可用但模型可能用得更差。Preview 组的 **Preview final system prompt** 调上面的 RPC，只读、可 Copy、可 Refresh，保存后自动刷新。
- **Codex 内核**：Codex 不能替换自己的系统提示，全局与项目文本组合（`# Custom instructions` / `# Project instructions` 标题）追加到 `thread/start` 与 `thread/resume` 的 `developerInstructions`（0.155.1 两者都有该字段），新会话与重启后重新打开的会话生效；设置页的说明随之改写，不显示系统提示预览与 “Start from built-in default”。
- **实测**（真实 DeepSeek，隔离的 `DSH_HOME`）：全局指令设为 `You are Captain Whale. Always start replies with 'Arrr'.`，回复为 "Arrr, hello there, matey!"；预览（无线程与线程内）都恰好等于这段文字；会话日志里的 `system/message` 内容就是这一段，没有任何 "DeepSeek Harness" 默认文字。

## 已知限制（诚实列出）

- 未实现：`review/start`、`thread/revert`（经 `capabilities.unsupportedMethods` 告知 app：/review、/rewind 不出现在斜杠菜单，并提示该内核暂不支持）、MCP 配置写入（`config/batchWrite`；在 `profile/cordis.patch.yml` 手动加 `@deepseek-ai/dsh-mcp-client` 条目后 Reconnect）、MCP OAuth 登录、逐技能开关（`skills/config/write`；用 SKILL.md 的 `disable-model-invocation: true`）、账户余额（`account/rateLimits/read` 的 credits；Harness 只有登录 DeepSeek Platform 后才有钱包余额）、app 内保存 API key（`account/login/start`）。技能列表、config/read、MCP 状态、插件（bundle）列表与账户 token 用量（来自本机会话日志）已实现。
- `account/usage/read` 是本机 `~/.dsh` 会话日志的统计，不是 DeepSeek 平台账单：别的机器、直接调 API 的用量不在内；模型重试中途失败的 attempt（`assistant/attempt`）不计。首次读取要逐个回放全部会话日志（之后只读变化的）。
- MCP 状态只看插件 fiber：`failOnStartupError` 为 false（默认）的服务器即使首次连接失败也会 active（无工具，并自行重连），这时显示 Connected、0 个工具。MCP 服务器是内核级的，所有会话共用，状态不按会话区分。
- 用户自己 DeepSeek Harness App profile（`~/.dsh/profiles/…`）里的 MCP 服务器和插件不会被 OpenClaude Desktop 的内核加载；Connectors / Plugins 页只显示桥接层 profile（`harness/profile`）里的内容。
- OpenClaude Desktop 偏好里记住的 Codex 会话（cliVersion 为纯版本号或 modelProvider 为 openai）在 DeepSeek 内核下读不到：侧栏不列出它们，只在列表顶部显示一行说明（"N Codex sessions aren’t available with the DeepSeek core…"），id 保留在配置里，`CODE_DESKTOP_CORE=codex` 启动即恢复。
- 没有可压缩历史时 `/compact` 仍以 completed 的空轮结束（界面显示 "Conversation compacted"），回放里不留这一轮。
- `thread/delete` 同时删除对应的 Harness 历史目录（`<DSH_HOME>/sessions/<project>/<id>/`，桥接 `index.js` 的 `deleteSessionFiles`）；其他会话不受影响。fake smoke 使用临时 `DSH_HOME` 验证删除后的目录与会话不可读。
- 图片附件走 Harness 附件存储，以图片块发给模型；只有不支持图片输入的模型（目录里 `inputModalities` 不含 `image`，如 deepseek-v4-pro）不能附图：app 在暂存时就拒绝（"The selected model doesn’t support image input."），已暂存后再换模型发送则内核返回 `-32602`。用户气泡里的图片是附件存储里规范化后的副本（可能被缩小、换格式），不是原文件。`@` 提及的行内 chip 位置（`text_elements`）不保存，回放时提及只显示为文件卡片；技能以 `/name` 文本出现在气泡里（不是技能卡片）；以前用文本标记发出的图片在回放里显示为图片卡片（原路径）。
- 部署人格前缀在 `packages/code-desktop-app/cordis.patch.yml`；`developerInstructions` 是它后面的一个段，不替换它。
- Workflow 成员的模型、用量、活动工具数、耗时和重试状态来自持久事件；未知用量保留为未知。成员通过 childId 关联子代理会话。
- Harness 没有"本会话一直允许"的原生授权；`acceptForSession` 由桥接层按上面的授权键记在内核进程的内存里：离开再打开同一会话仍有效，内核重启后失效。提权到 danger-full-access 的文件写入不提供本会话授权（原版对项目外文件也不给常驻授权）。
- 额外工作目录不是 Harness 的可写根：模型写入那里时第一次仍会看到 `[sandbox: file access denied under workspace-write mode]`，需要自己带 `sandbox_permissions` 重试一次（随后自动放行）；bash 在这些目录里写文件仍会弹提权卡片。Plan 评审通过后的同一轮里额外目录暂不生效（Plan 的只读策略不带 writableRoots），下一轮恢复。
- Plan 评审用的是通用问题卡 + Markdown 计划条目，原版专用的计划卡（"Claude proposed a plan"、Open plan、Revise）没有移植。`multi_select` 问题在问题卡里只能单选；`ask_user_question` 用 legacy 阻塞模式，没有接 timed 模式（`attachWait` / 迟到回复）。
- 首次连接需启动 Harness 运行时（约 2–4 秒），期间首页显示 "Connecting to DeepSeek…"。
- 冷读（侧栏、自动归档、`thread/list`）的 `model` 是默认路由，不是会话日志里的模型；打开会话（`thread/resume`）后才是真实模型。冷行的 `updatedAt` 是最后一次提问时间，已加载线程是最后一次回复/轮次结束时间，两者可能差几分钟。投影缓存按节流写入（每 200 个事件或 5 秒，轮次结束与会话释放时必写）。本内核启动后另一个进程（DeepSeek App）才写的检查点，本进程的缓存表一直看不到：不带轮次的 `thread/read`（侧栏、自动归档）发现日志 revision 变了会回放一次，但 `thread/list` 的行（标题、最近时间）会停在旧值，直到某次 `thread/read` 回放写回或内核重启。另一个进程正在跑一轮时，每次 `thread/read` 都回放（不写回半截的轮次）。启动列表与缓存表加载之间被别的进程写入的会话，revision 已是新的，那一次写入要等下一次变化才会被发现。
- 离开或归档会话才释放写锁；仍在运行、有排队或待处理卡片、有后台 job 的会话保持加载（不会在空闲后自动释放），直到下次离开它或退出 OpenClaude Desktop。`thread/backgroundTerminals/list` 返回会话自己仍在运行的 bash/pwsh job（jobs.js），`terminate` / `clean` 可停止它们，Tasks 面板显示并能 Stop。在 DeepSeek App 里打开着的会话，OpenClaude Desktop 打开时报 `sessionBusyElsewhere`，转录区显示通用的加载失败状态（Retry），已有内容时横幅显示这句说明。
- Dynamic workflows 现在跑在 DeepSeek 内核上：`main.cjs` 按 `resolveCore()` 给 workflow runner 传 `{command: node, args: [本脚本, 'app-server', '--stdio']}`（workflow-service.cjs `workflowCoreCommand`；`CODE_DESKTOP_WORKFLOW_BINARY` 仍可覆盖，`CODE_DESKTOP_CORE=codex` 时仍用 Codex CLI）。runner 的 `developerInstructions`（agentType 的 system prompt）与 `outputSchema`（`agent(prompt, {schema})`）都由上面的 structured.js 实现。runner agent 的权限跟随启动时会话的 Mode（app `permission-policy.mjs workflowAccess`，主进程推出）：Auto / Accept edits → workspace-write，Bypass → danger-full-access，Plan / Ask / chat → read-only；一律 `approvalPolicy: never`（不询问），脚本的 `sandbox` 选项不能提高它。注意 workspace-write 下 DSH 文件策略也允许写平台临时目录。
- 子代理：只投影持久事件，不转发子代理的 token 级流式增量（Tasks 面板里的回答按步出现，不逐字出现）；子代理的审批卡片显示在父会话上（按命令 / diff，没有子代理条目的 "run <description>" 标题）；前台运行与可续运行之外的后台 job 形式（`started background subagent job`）不跟踪结束状态；内核重启前没有收到结束通知的可续子代理，回放时委派行仍是 running。本批次之前创建的子代理没有记下 label，`thread/list` 里 `agentNickname` 为空（app 回退到委派行的 description，`thread/read` 从子会话的 descriptor 读到 label）。

### 模型参数与价格

Settings → Models（C5，只对 DeepSeek 内核生效；Codex 内核下页面显示提示、控件禁用，main 不发送任何额外字段）。偏好键 `modelSettings = {params: {[模型 id]: {maxTokens?, temperature?, effort?}}, prices: null | {[模型 id]: {displayName?, offPeak, peak}}}`（app/electron/prefs/model-settings.mjs；maxTokens 为 256–1,000,000 的整数，temperature 0–2 保留两位小数，价格为每 1M token 的人民币 0–10000，每张表 ≤50 项；`prices: null` 表示官方价）。

- **请求参数**：main.cjs（app/electron/model-settings.cjs `decorate`）在 `thread/start`、`thread/resume`、`turn/start` 上写 `params.codeDesktop.customization.modelParams = {[wire 模型 id]: {maxTokens?, temperature?}} | null`。桥接（customization.js → model-params.js `installModelParams`）在 agent 作用域注册 `agent/request` 瀑布：每次请求按 `catalog.wireId(provider, model)` 取条目，设 temperature / maxTokens；没有条目时去掉 temperature（回到适配器默认），并去掉自己上次设的 maxTokens（日志里的请求头会把它带进下一次提案），别处来的 maxTokens 保留。修改从下一次请求生效。**top_p 不支持**：dsh-llm 的 `LlmCallConfig` 只有 maxTokens / temperature / stop，没有 top_p 字段。
- **默认推理强度**：`params[id].effort` 只在 app 内生效：`withEffortDefaults` 把它写进 `boot.models` 条目的 `defaultReasoningEffort`（必须在 `supportedReasoningEfforts` 内），模型菜单、/model 与 Settings 的模型行在选中该模型时都会把强度设成它；之后手动调过的强度照常保留。
- **价格表**：`account/usage/read` 带上 `params.codeDesktop.prices`；桥接 pricing.js `normalizePrices`（与偏好相同的校验）→ `priceTable` = 官方表 + 覆盖项，usage.js `deepseekUsage(summaries, today, table)` 用它估算费用（折叠缓存只存 token 数，换价格不需要重新折叠；响应的 `deepseek.customPrices` 为 true 表示用了自定义价格）。旧 Flash id（deepseek-v4-flash 等）只有在表里没有自己的条目时才按 deepseek-flash 计价。新 RPC `codeDesktop/pricing/read` 返回 `{official, aliases, pricingUrl, peakWindows}`，设置页用它预填表格；第一次编辑会把官方表整份复制进 `prices`，"Reset to official prices" 写回 null。旧内核没有这个方法时（METHOD_NOT_FOUND）页面按"无官方表"处理。
- **自定义 OpenAI 兼容服务商**：不需要新的 Harness 代码。dsh-base 里本来就挂着休眠的 `llm-pi-ai` 行，给它 `providers: {[路由]: {displayName, api, baseURL, apiKeyEnv, models}}` 就会注册路由（`api` 取 `openai-completions` / `openai-responses` / `anthropic-messages`，即 dsh-llm-pi-ai `supportedProtocols()`）。Settings → Models → Custom providers 把服务商定义写在 `<userData>/harness/providers.json`，密钥用 Electron safeStorage 加密存在 `<userData>/harness/provider-keys.bin`，再通过 Settings › Harness 的托管覆盖层（harness-profile.cjs `setManagedRow('llm-pi-ai', …)`）写入这一行，并把每个密钥作为环境变量 `CODE_DESKTOP_PROVIDER_KEY_<路由>` 交给内核进程（credentials-local 从继承的环境读取 `apiKeyEnv`）。重启内核后这些模型出现在模型菜单里。密钥不会写进 preferences.json、覆盖层文件或 `~/.dsh`，也不会回传给渲染进程。路由 `deepseek` 保留给内置服务商。关闭 Settings › Harness 的 "Use app overlay" 或 Reset overlay 会让服务商失效（providers.json 仍在，再保存一次即可恢复）。

## 文件

| 路径 | 作用 |
|---|---|
| `bin/codex-app-server.mjs` | 启动器：加载 `profile/`，`runProfile` 启动 Harness |
| `profile/` | 应用自有 profile：dsh-base + 本 bundle |
| `packages/code-desktop-app/` | bundle：人格、禁用 LLM 标题、挂载插件（默认模型 `deepseek-flash`） |
| `packages/codex-app-server/src/index.js` | 插件主体：请求分发、会话/agent 管理、流式、审批与提问 |
| `packages/codex-app-server/src/projection.js` | 会话事件 → Codex Turn/Item（实时与回放共用）；`thread/resume` 响应后的 token 用量与计划回放（`resumeReplayNotes`） |
| `packages/codex-app-server/src/input.js` | 用户输入两个方向：Codex 部件 → Harness 内容（图片进附件存储、技能 `/name`、文本标记）与 Harness 内容 → Codex 部件（`toCodexInputs`、预览文本 `promptText`） |
| `packages/codex-app-server/src/compact.js` | `thread/compact/start` 的收尾：保证每次压缩都以 turn/completed 结束 |
| `packages/codex-app-server/src/queue.js` | `thread/queue/*` ↔ agent inbox |
| `packages/codex-app-server/src/approval.js` | 审批来源与处理决定（`approvalDecision` / `approvalAnswer`）、"本会话允许"授权键与 preset 变化时的清理（`updatePermission` / `presetFor`）、英文 reason、额外工作目录的路径判断、只读工具表与子代理审批（`rootThreadFor` / `childDecision` / `childApproval`） |
| `packages/codex-app-server/src/list.js` | 会话列表冷行：`sessionListMetadata` 投影单元（上游原样）与注册、缓存读取（`cachedValues`）、`coldRow`、`readColdThread`、缓存表的日志 revision（`CacheRevisions`）、回放能否写回（`seedable`）、`matchesSearch`、`titleOf`，以及 unsubscribe 时是否必须保持加载（`mustStayLoaded`、`descendantIds`、`ownsRunningJob`） |
| `packages/codex-app-server/src/subagents.js` | 会话谱系 → Codex 线程字段（`threadLineage`：parentThreadId / forkedFromId / thread_spawn source / agentNickname）与 `thread/list` 的 sourceKinds 过滤 |
| `packages/codex-app-server/src/structured.js` | `developerInstructions` 段、一轮的 `structured_output` 捕获、Dynamic workflows 开关（`workflowsAllowedBy` / `hideWorkflowTool`） |
| `packages/codex-app-server/src/system-prompt.js` | 自定义系统提示：agent 作用域的 `system-prompt/assemble` 替换、`codeDesktop/systemPrompt/preview`（customization.js 装上，instructions.js 是其后的项目指令段） |
| `packages/codex-app-server/src/plugins.js` | `codeDesktop/plugin/*` → dsh-plugin-manager（参数校验、install 输出通知参数） |
| `bin/profile.mjs` | 用户 profile 的创建/修复（`prepareProfile`）与插件安装用的 pnpm（`packageManager`） |
| `packages/codex-app-server/src/workflows.js` | 模型 `workflow` 工具的运行 → `item.workflowRun`（纯函数：`workflowRunOf`、`workflowRecord`、`workflowPhase`、`workflowToolResult`、`workflowInterrupted`） |
| `packages/codex-app-server/src/questions.js` | `user-questions/request` ↔ `item/tool/requestUserInput` 映射、计划评审判定、Plan 模式提示 |
| `packages/codex-app-server/src/errors.js` | 需要 app 区分的 RpcError（`threadNotFound`、`skillToggleUnsupported`）与 Harness 错误的 cause 链判断 |
| `packages/codex-app-server/src/account.js` | `account/read`：凭据服务的 key 状态与 DeepSeek Platform 登录 → Codex 账户 + `deepseek` 扩展 |
| `packages/codex-app-server/src/pricing.js` | DeepSeek 官方峰谷价（人民币/百万 token）、模型归并与高峰判定（纯函数） |
| `packages/codex-app-server/src/usage.js` | `account/usage/read`：会话日志 → 按本地日期的 token 桶、最长轮次、连续天数、按价估算的 `deepseek` 扩展；`codeDesktop/stats/read`：同一折叠里的每日会话/消息/工具调用、小时直方图、分模型 token 与用量；按 revision 的折叠缓存（`usage-cache.json`） |
| `packages/codex-app-server/src/catalog.js` | 设置目录：技能 → `skills/list`、权限与 MCP 条目 → `config/read`（只给 env/header 键名）、MCP client 条目 → `mcpServerStatus/list`、bundle → `plugin/installed` / `plugin/read` |
| `packages/codex-app-server/src/models.js` | 模型目录 → `model/list`；路由的目录条目（`entryFor`）与输入模态（`modalitiesOf`） |
| `packages/codex-app-server/src/diff.js` | Myers 行 diff → 无头 unified diff |
| `packages/codex-app-server/src/transport.js` | 换行 JSON-RPC 传输 |
| `tests/live-smoke.mjs` | 真机端到端测试 |
| `tests/fake-model-smoke.mjs` | 脚本化模型的端到端测试（本地 Messages 服务，无需 key） |

## 自定义斜杠命令（C3，仅 UI 侧，两种内核都可用）

- 文件：全局 `<userData>/commands/*.md`（可在 Settings › Commands 改到任意绝对路径，偏好键 `customCommands.globalDir`），
  项目 `<cwd>/.code-desktop/commands/*.md`（`customCommands.projectEnabled` 控制）。文件名即命令名（`[A-Za-z0-9][A-Za-z0-9_-]{0,63}`），单文件 ≤64 KB，每目录 ≤200 个。
- 可选 frontmatter：`description`、`argument-hint`。正文里的 `$ARGUMENTS` / `{{args}}` 换成 `/name` 后面的文字；没有占位符时把参数追加到末尾。
- 在 `/` 菜单的 “Custom” 分组出现；优先级：内置命令 > 项目 > 全局 > 技能（同名技能会被隐藏）。发送时展开成普通消息文本，内核无需改动；会话标题仍是用户输入的 `/name args`。
- 主进程 `app/electron/custom-commands.cjs`（`desktop:call "custom-commands"`：list/save/delete→废纸篓/reveal/pick-dir）监视两个目录并推送 `custom-commands-changed`；渲染侧 `custom-commands-model.mjs` / `custom-commands-store.mjs`，设置页 `source-settings-commands.jsx`。

## 主题（C4，仅 UI 侧，两种内核都可用）

- Settings › Theme。偏好键 `customTheme = {preset, accent ('' 或 #rrggbb), uiFont, fontScale 0.85–1.25, density 'compact'|'comfortable', radiusScale 0–2}`（app/electron/prefs/theme.mjs，`null` = 恢复默认）；代码字体与代码主题仍用原有的 `codeFont` / `codeThemeLight` / `codeThemeDark`。
- 实现只覆盖设计系统已有的 CSS 自定义属性，不改组件 CSS（app/src/theme-custom-model.mjs）：`<html>` 内联 `--cds-rem-scale`（字号）与 `--cds-role-accent-{50…850,fill,fill-hover,on}`（由强调色用 `color-mix(in oklab, …)` 派生，on 色按 WCAG 亮度选黑/白）；`<style id="code-desktop-custom-theme">` 在 `:root[data-custom-theme]` 下覆盖 `--font-ui` / `--cds-font-sans` 与圆角 token（`--cds-radius*`、`--cds-radius-composer`、Tailwind `--radius-*`，基准值取自 c6a992d55 CSS 的 compact/comfortable 两套）。默认主题不留任何内联属性、属性或样式元素。密度切换主窗口 App 根元素的 `data-density`。
- 内置预设：Default、DeepSeek blue、Clay、Forest、Grape、Sharp、Rounded。导入/导出走主进程文件对话框（app/electron/theme-files.cjs，`desktop:call "theme-file"` `{op:'import'|'export'}`，≤256 KB），文件格式 `{"format":"code-desktop-theme","version":1,"name",accent,uiFont,fontScale,density,radiusScale,codeFont,codeThemeLight,codeThemeDark}`；导入合成一次设置补丁，未知代码主题回落默认并给出提示。
- 已知缺口：弹出窗口（popout）保持默认主题。
