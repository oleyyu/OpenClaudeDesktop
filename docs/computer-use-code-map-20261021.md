# Computer Use：现有 JS 侧代码地图（2026-10-21，只读调研）

分支 `ui-next`，HEAD `a0186be`。本文只描述**现状**，不含实现；行号以 HEAD 为准（`app/` 下的相对路径）。
目的：给 M4（app_key / app_scroll / app_bring_to_current_space、系统应用事件）和 display-scope（全屏那一套工具面 +
request/release_full_control）、剪贴板、teach 三件套、假光标 / overlay 打磨这几条线提供一张"改哪里、复用什么、要抽什么"的图。

符号约定：**[app]** = 只为 app_* 写死的地方；**[抽]** = display-scope 复用前需要抽出来的点；**[占位]** = 返回非真实结果的位置。

> **现状说明（第二轮最终回归时更新，2026-10-21）**：本文是开工前的调研快照，行号仍是 HEAD `a0186be` 的；其中"占位 / 未注册 /
> Web 假光标"等描述已在下面逐处改成现状（标 **现状**）。总的结论：`OWN_COMPUTER_USE_TOOLS` 现在是 **44 个**（等于官方名单），
> **0 个占位**，display-scope 一整套已注册并返回真实结果；`rawPathRefusal` / `notInBuild` / `BUILD_SCOPE` 已删，`failure()` 已改为统一拒绝形状；
> 幻影光标默认走原生 `PhantomCursor.swift`（NSPanel），Web 面板只在原生不可用时回退。§15 / §16 是开工前的计划与风险，处理结果见
> `docs/computer-use-handoff-20261021.md`（总表、第三～六节、第九节取舍）。

---

## 0. 文件总览

| 层 | 文件 | 行数 | 职责 |
|---|---|---|---|
| 工具名单（单一来源） | `electron/computer-use/actions.mjs` | 116 | `OWN_COMPUTER_USE_TOOLS`（开工时 24 个；**现状 44 个**，等于官方名单）、`APP_KINDS`、`KINDS`、`computerUseAction()`（把各种形态的 transcript item 归一成一个 action）。主进程与渲染进程共用，纯函数 |
| 工具注册 / schema | `electron/agent-tools/computer-use.mjs` | 674（现状 1682） | 开工时 24 个工具，**现状 44 个**（含 display-scope 一整套、full control、剪贴板、teach）的 description / inputSchema / handler；统一拒绝封装、next_step 表；app_batch / computer_batch / teach_batch |
| 服务（主进程） | `electron/computer-use/service.cjs` | 527 | 每会话 grants + 窗口状态；所有工具背后的方法；IPC `call()` |
| 授权 / 分级 | `electron/computer-use/grants.cjs` | 74 | 每会话授权表、tier、flags |
| 运行时闸门 | `electron/computer-use/guards.cjs` | 38 | `actionGate(probe, op)`、`checkTier()` |
| 原因策略 | `electron/computer-use/reason-policy.cjs` | 126 | FALLBACK / PLANNED_M3 / BLOCK / RETRY / PENDING_RAW 与 `decide()` |
| 双轨执行器 | `electron/computer-use/executor.cjs` | 61 | `execute()`（AX → policy → raw）、`deliver()`（raw 单次投递 + 退避） |
| 截图预算 / 坐标链 | `electron/computer-use/budget.cjs` | 48 | `fit` / `scaled` / `frameToWindowLocal` / `windowLocalToScreen` / `inFrame` |
| 原生模块加载 | `electron/computer-use/native.cjs` | 38 | `computer_use.node` 的 `call(method, json)` 包装；`coded()` |
| AX helper 包装 | `electron/computer-use/ax-helper.cjs` | 40 | 路由到原生 `axProbe` / `focusWindow` / `menu {mode}` / `listApps`（第二轮起；原子进程 `helpers/cu-ax` 已删） |
| 应用解析 / 图标 | `electron/computer-use/apps.cjs` | 114 | 名称→bundle（目录 + mdfind）、list_apps 分页、Quick Look 图标 |
| in-use 信号 | `electron/computer-use/in-use.cjs` | 43 | 哪些会话"正在用电脑"（停靠条、光晕、预览的共同信号） |
| 屏幕光晕 | `electron/computer-use/glow.cjs` + `glow-page.cjs` | 156 + 8 | 官方 `[cu-glow]` 的移植，整块显示器的 inset 光晕 + 徽标 |
| 实时预览 | `electron/computer-use/preview.cjs` | 71 | 会话 rail 卡的 1 fps 帧（只有 `mode: "app"`） |
| 假光标 | `electron/computer-use/cursor.cjs` | 101（现状 211） | **现状**：默认调原生 `setPhantomCursor` / `hidePhantomCursor`（`PhantomCursor.swift`，每窗口一个 NSPanel，照官方 §2.6）；只在原生缺失或 `main_thread_unavailable`（`ELECTRON_RUN_AS_NODE`）时回退到原来的 40×40 Web 面板 |
| i18n | `electron/i18n/zh-CN/computer-use.mjs` | 112 | 工具 / 卡片 / 设置文案的中文 |
| 渲染：模型 | `src/computer-use-model.mjs` | 192 | 动词、图标、官方工具名映射、授权卡模型 |
| 渲染：步骤行 + 停靠条 | `src/source-computer-use.jsx` | 68 | `SourceComputerUseStep`、`SourceComputerUseBanner` |
| 渲染：授权卡部件 | `src/computer-use-approval-card.jsx` + `.css` | 67 + 6 | 标题变体 `ZEe`、能力行 `TT`、应用行 `GEe` |
| 渲染：rail 卡 | `src/source-session-rail-computer-use.jsx` | 107 | 活动面板卡（实时帧 / 最后截图） |
| 渲染：设置 | `src/source-settings-computer-use.jsx` | 70 | 开关、Allowed apps 芯片、Teach mode 入口 |
| 原生（参考） | `native/computer-use/Sources/{ComputerUseBridge,ComputerUseCore,ComputerUseNAPI}` | — | Swift + N-API；本文只列 JS 调到的方法 |
| AX 调用（原 helper） | `native/computer-use/Sources/ComputerUseCore/MenuBar.swift` | — | probe / focus / menu / menuList / menuClose / apps（第二轮从 `helpers/cu-ax` 并入） |
| harness | `harness/packages/acp-bridge/src/app-tools.js` | — | `APP_TOOL_NAMES`（开工时含 24 个 CU 名字，现状 44 个；screenshot / scroll / type 与 preview 同名，只列一次） |

---

## 1. 工具注册与 schema（`electron/agent-tools/computer-use.mjs`）

### 1.1 结构

- `group = "computer-use"`（l.20）。host（`electron/agent-tools-host.cjs`）按文件名**字母序**加载 `agent-tools/*.mjs`，同名工具**先到先得**、后者 warn 并丢弃（host l.168）。`main.cjs:389 agentToolGroupEnabled("computer-use")` 读 `config.agentComputerUse !== false`。computer-use 组**不在**延迟加载组里（`main.cjs:530` 只有 workflow / monitor / schedule / findings / notebook / window）。
- `ctx.computerUse` 由 `main.cjs:756` `agentTools.provide("computerUse", …)` 提供：`{service, resolveApps, listApps, ask}`。
- 公共助手：

| 符号 | 行 | 作用 | 备注 |
|---|---|---|---|
| `FLAGS` | 22 | `clipboardRead / clipboardWrite / systemKeyCombos` | request_access 的三个 flag |
| `MAX_APPS` / `MAX_BATCH` | 23–24 | 32 / 20 | |
| `failure(code, message, nextStep, details)` | 33 | 开工时返回 `{ok:false, error:{code, message, next_step}}` + isError | **现状**：已改为统一形状 `{ok:false, outcome, reasonCode, errorKind?, message, next_step}` + isError（§16.6 已解决） |
| `NEXT_STEPS` | 38–57 | service / native 错误码 → next_step | 多条措辞写死 "app_screenshot" **[app]** |
| `REASON_STEPS` | 59–71 | outcome.reasonCode → next_step | drag / menu / focus / click 专用 |
| `serviceFailure(error, app)` | 73 | 抛出的 coded error → failure() | |
| `checkGrant(ctx, app)` | 80 | bundleId 合法 + 本会话已授权 | **[app]**：以 `app` 参数为准；display-scope 没有 `app` 参数，需改成"前台/命中点所属应用"判定 **[抽]** |
| `checkAddressing(args, {required})` | 91 | coordinate / element_index / target 三选一 | **[app]**（display-scope 只有 coordinate） |
| `notYet(reasonCode, message, nextStep)` | 104 | `{ok:false, outcome:"unsupported", reasonCode, message, next_step}` + isError | 统一形状 |
| `imageResult(text, dataUrl)` | 108 | data URL → MCP text + image content | 可直接复用 |
| `RAW_PATH_STEP` | 113 | requires_raw_path 的 next_step | |
| `outcomeResult(result, nextStep)` | 115 | `{ok, ...result, next_step?}`，非 ok 时 isError | 统一形状；可直接复用 |
| `windowId(args)` | 120 | | **[app]** |
| 共享 schema `APP` / `WINDOW_ID` / `SCALE` / `COORDINATE` / `ELEMENT_INDEX` / `TARGET` / `ACTION_SUMMARY` | 123–130 | 描述里写死 "last app_screenshot of this window" | `COORDINATE` 语义是**窗口帧像素** **[app][抽]**；display-scope 要另一个 "最近一次 screenshot 的显示器帧像素" 的 COORDINATE |
| `screenshot(args, ctx, {keepReference})` | 133 | app_screenshot 与 batch 内 screenshot | **[app]** |
| `batch(args, ctx)` + `BATCH_TOOLS` + `partsOf()` | 622–656 | app_batch：逐个调用同名工具的 handler，遇错即停 | `partsOf` 和"逐个调 handler + 遇错即停 + 图片附后"的骨架可复用给 `computer_batch` / `teach_batch` **[抽]** |
| ~~`rawPathRefusal(what)`~~ | 658 | requires_raw_path | **现状：已删**（app_key / app_scroll / app_bring_to_current_space 都有真实实现） |
| ~~`BUILD_SCOPE` / `notInBuild(what)`~~ | 662–666 | not_supported_in_build | **现状：已删**（display-scope、full control、teach 都已实现） |
| `clipboardRefusal(result)` | 668 | 开工时：先查 flag，有 flag 再 not_supported_in_build | **现状**：只把剪贴板工具真实的拒绝结果（缺 flag、未接管、state_conflict 等）包成统一形状，不再有 not_supported_in_build |

### 1.2 24 个工具逐个（开工时；现状列已更新，另 20 个 display-scope 工具见表后）

| 工具 | 行 | handler → service | tier op | 现状 |
|---|---|---|---|---|
| request_access | 146–202 | `resolveApps` → `grants` → `cu.ask()`（授权卡）→ `grants.grant()` | — | 真实。返回 `granted / denied / flags / screenshotFiltering:"granted_apps_only"` |
| app_list_windows | 203–215 | `listWindows` | — | 真实 |
| app_screenshot | 216–228 | `appScreenshot` | see | 真实 |
| app_ax_find | 229–253 | `axFind`（纯 JS，搜上次截图的 elements） | — | 真实 |
| app_click | 254–279 | `appClick(..., axOnly:true)` | left_click / right_click | 真实（全 AX：AXPress、AXShowMenu、AXSelectedTextRange） |
| app_type | 280–307 | `appType` | type | 真实（AX → FALLBACK 两条 → rawType） |
| app_release | 308–322 | `release`（不查授权） | — | 真实 |
| app_focus | 323–337 | `appFocus` → axHelper `focus` | left_click | 真实 |
| app_menu | 338–370 | `appMenu` → axHelper `menu / menuList / menuClose` | menu（list 用 see） | 真实 |
| app_zoom | 371–395 | `appZoom`（裁上次截图，`image.crop`） | — | 真实（非高清） |
| list_apps | 396–420 | `cu.listApps` → apps.cjs → axHelper `apps` | — | 真实，不需要授权 |
| app_batch | 421–453 | `batch()`；动作枚举 click/type/key/scroll/screenshot/zoom/drag | — | 真实；**现状**：key / scroll 步走真实的 app_key / app_scroll |
| list_granted_applications | 454–465 | `grants.list()` / `flags()` | — | 真实；**现状**：另带 `preferredMode` / `fullControlApproved`，全屏批准后 `coordinateMode` 为 `display` |
| app_key | 468–480 | **现状** `cu.appKey` → `keyResult` | key | **现状：真实**（AX 档 return / escape / backspace / cmd+a；其余官方后台键经 pid 投递，unverified） |
| app_scroll | 481–493 | **现状** `cu.appScroll` → `scrollResult` | scroll | **现状：真实**（纯 AX：竖直滚动条 AXValue，读回） |
| app_drag | 494–521 | `appDrag` | drag | 真实（事件路径）；**现状**：系统应用读回不变一律 `drag_ineffective`（`system_app_ignores_posted_events` 已删） |
| app_bring_to_current_space | 522–529 | **现状** `appBringToCurrentSpace` → `bringResult` | — | **现状：受限**（最小化 / 隐藏拉回真实；跨进程移 Space 被 WindowServer 忽略 → `op_unavailable`） |
| request_full_control | 530–537 | **现状** `service.requestFullControl`（必要时 `askTakeover` 接管卡） | — | **现状：真实**（只记批准，锁在下一次 display-scope 动作时拿） |
| release_full_control | 538–545 | **现状** `service.releaseFullControl` | — | **现状：真实** |
| read_clipboard | 546–553 | **现状** `clipboardTool("read")` | — | **现状：真实**（要 flag + 全屏接管） |
| write_clipboard | 554–561 | **现状** `clipboardTool("write")` | — | **现状：真实**（click 层应用在前时拒绝） |
| request_teach_access | 562–574 | **现状** `requestTeachAccess`（teach 卡） | — | **现状：真实** |
| teach_step | 575–592 | **现状** `teachStepTool`（`teach.cjs` 提示层） | — | **现状：真实** |
| teach_batch | 593–619 | **现状** `teachBatchTool` | — | **现状：真实** |

文案：`app_batch`、`app_drag` 的 description 走 `t()`，其它直接英文；工具描述是自写的（未照抄官方）。

**现状：另 20 个 display-scope 工具已注册并返回真实结果**：`screenshot` `zoom` `left_click` `double_click` `triple_click` `right_click` `middle_click` `scroll` `left_click_drag` `mouse_move` `cursor_position` `left_mouse_down` `left_mouse_up` `type` `key` `hold_key` `open_application` `switch_display` `wait` `computer_batch`（全局 HID 事件、官方闸门顺序：接管 → 前台层级 → 命中测试 → 投递）。其中 `screenshot` / `scroll` / `type` 与 preview 同名，host 用 `sharesName` + `prefersSharedTool` 按会话挑一个（交接第一节总表）。

---

## 2. `service.cjs`：方法与状态

### 2.1 状态（全在内存，应用退出即丢）

`createComputerUse({native, axHelper, image, pointer, log, wait, decide, selfBundleIds})`（l.133）：

| 状态 | 行 | 形状 | 说明 |
|---|---|---|---|
| `sessions` | 134 | `sessionId → grants`（grants.cjs） | 授权，`grantsFor()` 懒建（l.140） |
| `windows` | 135 | `sessionId → {shots: Map("bundle:window" → shot), last: Map(bundle → windowId), target?}` | **[app]**：坐标参照以 `bundle:window` 为键；display-scope 需要 `display:<id> → shot` 的参照（或在同一 state 里加 `displayShot`）**[抽]** |
| `state.target` | 222 | `{bundleId, windowId}` | 预览目标（`lastTarget()`，l.176）**[app]**（display 模式下应是 displayId） |
| 常量 | 34–43 | `SUMMARY_LINES=40`、`MAX_TYPE_UNITS=10000`、`SYSTEM_COMBOS`、`MODIFIER_*`、`MAX_MENU_DEPTH=8` | `SYSTEM_COMBOS` 与 `systemKeyCombos` flag **没有关联**：现在一律拒（`system_key_combo_refused`），flag 授了也不放行 |

模块级纯函数：`normalizeCombo`（l.46）、`checkScale`、`checkId`、`elementLine`、`summaryText`（l.67，**[app]** 窗口措辞）、`elementAt`、`secureFieldRefusal`、`dragCoordinates`（l.94）、`POSTED_EVENT_SYSTEM_APPS`（l.111）、`dragReadback`（l.113）、`checkBudget`（l.519）。

### 2.2 方法

| 方法 | 行 | 调 native / helper | 说明 / 复用性 |
|---|---|---|---|
| `grantsFor` | 140 | — | |
| `appDrag` | 153 | `probe` → `drag` | 帧像素 → 窗口局部 → 屏幕点（`dragCoordinates`），所以 native drag **已经收屏幕点**；display-scope 的 `left_click_drag` 可复用 native `drag`，只需不同的坐标换算 **[抽]** |
| `forgetSession` | 174 | — | |
| `lastTarget` | 176 | — | **[app]** |
| `probe` | 182 | `probe` | |
| `listWindows` | 183 | `listWindows` | |
| `captureWindow` | 187 | `captureWindow` | **[app]** |
| `captureScreen` | 195 | `captureScreen` | **display-scope 截图的底座已在**：只截已授权应用 + 壁纸（SCContentFilter 包含式），返回 `frameWidth/Height、scaleFactor、displayId、displayBounds、excludedBundleIds、desktopWindowIds`。目前**只有 IPC `computer-use:capture-screen` 用到，没有任何工具调用它** |
| `appScreenshot` | 210 | `captureWindow(listsElements)` | 写 `state.shots / last / target`；`keepReference` 给 batch |
| `axFind` | 229 | — | |
| `release` | 247 | — | 只清窗口状态，不撤授权 |
| `appClick` | 267 | `probe` → `axClick` / `rawClick` | `axOnly` 时 raw 梯级为 null；`pointer.beforeClick/clicked`（l.310/314）。**现状**：假光标钩子覆盖所有落地的 app_* 动作（`beforeClick` / `clicked` / `moved` / `restore` / `released`），不再只在 appClick 成功时出现 |
| `appType` | 328 | `probe` → `axType` → `rawType` | |
| `appFocus` | 378 | `probe` → helper `focus` | |
| `appMenu` | 397 | `probe` → helper `menu / menuList / menuClose` | |
| `appZoom` | 426 | `image.crop` | 只裁已有截图 |
| `appKey` | 451 | `probe` → `deliver(rawKey)` | 开工时未接线；**现状**：app_key / app_batch 的 key 步调用它，照官方 AX 档 + 后台键集合重写，`systemKeyCombos` flag 授了才放行系统组合键 |
| `allGrants` / `revoke` | 470 / 486 | — | 设置页用 |
| `call(action, p)` | 496 | — | IPC：`computer-use:probe / grants / list-windows / capture-window / capture-screen / app-screenshot / all-grants / revoke`；**故意没有加授权的 IPC** |

### 2.3 系统应用（Finder / Dock / SystemUIServer）

- `POSTED_EVENT_SYSTEM_APPS`（l.111）只在 `dragReadback()`（l.113–126）里用：投递成功但 AXValue / AXSelectedTextRange / AXPosition 读回不变 → `ineffective` + `system_app_ignores_posted_events`（否则 `drag_ineffective`）。**它只改 reasonCode，不改投递方式**——这就是用户说的"只是翻译成正确的 reason"。
- **现状**：`POSTED_EVENT_SYSTEM_APPS` / `system_app_ignores_posted_events` 已删，系统应用拖拽读回不变一律 `drag_ineffective`；点击照官方梯子走 AX（行 `AXSelected=true` / 双击 `AXOpen`，Dock AXPress），`no_press_action` 不再产生；认证事件方向被安全机制拦截、未做（交接第二节）。以下是开工时的描述。
- 左键单击在 app_click 走 `axOnly:true`，raw 梯级根本不会被调用；`no_press_action` 在 `PLANNED_M3`（关闭）。
- 真正让它生效的地方在 native 投递（`Dispatcher.swift` 的 `postToPid`，l.30/31/41/158/167/182）：M4 计划的认证事件（`SLEventSetAuthenticationMessage` + `SLPostEventRecordTo`）要替换的就是这些调用点。JS 侧届时只需：① `no_press_action` 从 PLANNED_M3 移到 FALLBACK（附 app/scene/trigger/live），② app_click 去掉 `axOnly`（或按 bundle 放开），③ `dragReadback` 的 system-app 分支保留为诊断。

---

## 3. 授权 / tier / 闸门

### 3.1 `grants.cjs`

- `tierFor(bundleId)`（l.28）：浏览器 `read`、终端 / IDE `click`（含 `com.jetbrains.*` 前缀）、其余 `full`。
- `ALLOWED`（l.35）：`read:{see}`、`click:{see,left_click,scroll}`、`full:{see,left_click,scroll,click,type,key,right_click,middle_click,modifier_click,drag,menu}`。display-scope 的 `mouse_move`、`hold_key`、`left_mouse_down/up`、`cursor_position`、`open_application`、`switch_display` **没有对应 op** **[抽]**（需要补：例如 move → see 级？down/up → drag 级？——要对照官方规格定）。
- `createGrants({refuse})`（l.45）：`grant / revoke / clear / has / tierOf / list / allowedBundleIds / flags`。flags 只增不减（`clear` 才清）。**没有"全屏控制"状态**（官方的 full control lock / 已授权显示器）**[抽]**：request_full_control 的批准应落在这里或一个并列的 `fullControl` 对象里。

### 3.2 `guards.cjs`

- `actionGate(probe, op)`（l.10）：`see` 永远放行；drag 的顺序是 secure → typing → lock；其余是 lock → secure。**没有"目标应用是否前台 / 命中点属于哪个应用"的闸门**：app_* 靠 pid 定向投递，所以不需要；display-scope 的 HID 投递会落到命中点下的任何窗口，必须新增"命中点 / 前台应用 ∈ grants 且 tier 允许"的闸门（官方是 frontmost-app 检查，见 MCP 说明） **[抽]**。
- `checkTier(bundleId, tier, op)`（l.30）：抛 `tier_refused`，`TIER_HINTS` 文案。

### 3.3 `reason-policy.cjs` / `executor.cjs`

- 分类：`FALLBACK`（l.14：`system_app_ignores_posted_events`(drag)、`no_focused_text`(type)、`text_not_writable`(type)）、`PLANNED_M3`（l.42：`no_press_action`，CLOSED）、`BLOCK`（l.54）、`RETRY`（l.88：`user_actively_typing` 3×200 ms）、`PENDING_RAW`（l.92）。未列入的 reason → block + warn（fail-closed）。
- **`requires_raw_path` / `not_supported_in_build` / `permission_denied` 都不在 policy 表里**：它们只在工具层由 `notYet()` 产生，不经过 `decide()`，所以不会触发 unclassified 警告。新工具若让 service 返回这些码，需要补表。
- `execute()`（executor l.23）：AX → decide → retry / fallback(raw) / block；`focusedPointer` 时不落 raw。`deliver()`（l.48）：raw 单次投递 + RETRY 退避，已 delivered 不重放。**两者与 app_* 无耦合**，display-scope 的事件投递可直接用 `deliver()`。

---

## 4. 坐标链（`budget.cjs`）

- `BUDGET`（1568 px / 1568 token / 28 px per token）、`HIGH_BUDGET`、`JPEG_QUALITY 0.75`；`fit()` / `scaled()` 与 `Capture.swift TokenBudget` 镜像；`checkBudget()`（service l.519）对窗口与屏幕截图都校验。
- `frameToWindowLocal([x,y], shot)`（l.37）：帧像素 ÷ scaleFactor → 点。名字带 window，但只用 `shot.scaleFactor`（缺省时用 `shot.bounds.width`）。
- `windowLocalToScreen(point, bounds)`（l.43）：+ 窗口原点 → 全局屏幕点（左上原点，多显示器全局空间，负坐标保留）。
- **[抽]** display-scope：屏幕截图的返回字段是 `displayBounds` 而不是 `bounds`，所以链路是 `帧像素 ÷ scaleFactor + displayBounds.origin = 全局点`——可以复用这两个函数（把 `displayBounds` 当 `bounds` 传），但建议抽一个中性名字的 `frameToPoint(shot)` / `pointToGlobal(origin)`，并让 `inFrame` 对两种 shot 通用（它已经只看 frameWidth/Height）。反向（`cursor_position` 要把全局点换回最近截图的帧像素）**目前没有函数**。

---

## 5. native / helper（JS 视角）

- `native.cjs`：`createNative({file, load, platform})`，`call(method, params)` 解 `{ok, result}` 信封；模块缺失 → `native_unavailable`。打包后路径把 `app.asar` 换成 `app.asar.unpacked`。
- Bridge 的方法（`Bridge.swift dispatch` l.58–97）：`probe`、`listWindows`、`captureWindow`、`axClick`、`rawClick`、`drag`、`axType`、`rawType`、`textChunks`（测试）、`rawKey`、`captureScreen`。**没有**：scroll、mouse move、mouse down/up、key down/up（hold_key）、读写剪贴板、窗口跨 Space、全局 HID 投递、光标位置。
- `ax-helper.cjs`：一次一个子进程，8 s 超时，`helper_unavailable / helper_failed / helper_timeout`；方法 `probe / focus / menu / menuList / menuClose / apps`（`main.swift` l.232–237）。handoff 已记"M4 后并回 Bridge.swift、删 helper"。

---

## 6. glow / in-use / preview / cursor（"overlay" 这一层）

| 模块 | 行为 | 与 app_* 的耦合 / display-scope 要动的点 |
|---|---|---|
| `in-use.cjs` | 会话从本轮第一个 CU 步骤起"在用"，到 `turn/completed` 或 `app_release` 完成为止；连接断开清空。判定函数由 `main.cjs:420–423` 注入：`computerUseAction(item)` 非空且 kind ∉ {request_access, release, list_apps} | 官方跟随**全屏控制锁**的持有者；这里没有锁（注释 l.3–5）。display-scope 落地后，in-use 应改为"持锁 = 在用"（至少 request_full_control 批准 → 在用，release_full_control → 释放），`isRelease` 要认 `release_full_control` **[抽]** |
| `glow.cjs` + `glow-page.cjs` | 官方页面逐字移植；透明、鼠标穿透、screen-saver 层 panel 覆盖**一整块显示器**；`show / hide / moveTo / refreshMotion`；跟随显示器移除 / 尺寸变化 | 显示器由 `main.cjs:429 computerUseGlowDisplay()` 选：**本应用聚焦窗口所在的显示器**，不是目标窗口、也不是锁定显示器。display-scope 应 `moveTo(锁定的 displayId)`，`switch_display` 时再 `moveTo` **[抽]**。**没有任何"目标窗口高亮"**：光晕是整屏 rim，rail 卡是预览帧——用户说的"overlay 高亮是预览高亮，不是目标窗口高亮"指的就是这里缺一个按窗口 frame 定位的高亮层（官方对应物需在 spec 里确认） |
| `preview.cjs` | 订阅中且会话在用 → 每 1000 ms `captureWindow(lastTarget, scale 0.5)` → `{kind:"computer-use-preview", mode:"app", targetLabel, frame}` | **[app]** `mode: "app"` 写死（l.42）、只截窗口。渲染端（rail 卡 l.80）**已经支持 `mode === "display"`**（文案 "Full control · {target}"），所以 display 模式只需在这里按会话模式改用 `captureScreen(displayId)` **[抽]** |
| `cursor.cjs` | 40×40 panel，箭头 + clay 脉冲环，`pointAt({x,y})` 全局点，2 s 后 0.3 s 淡出；`hideNow()` 在每次点击前调用（防 AX 命中测试打到它） | **现状**：已改为原生 `PhantomCursor.swift`（官方 §2.6.2：每窗口一个 56×56 NSPanel、`order(.above, relativeTo: windowId)`、只在 app_click pulse、放锁隐藏），Web 面板只作原生不可用时的回退；display-scope 照官方不用幻影光标（动真光标），面板编号进命中测试忽略列表。以下为开工时：Web 近似：官方 `ComputerUseSwift.PhantomCursor`（NSPanel）只在 click 时 pulse、锁释放时隐藏而非定时淡出。只有 `appClick` 成功时调用 `pointer.clicked`（service l.313–315）；drag / type / menu 都不动它。多显示器：`setBounds` 用全局点，跨显示器能定位，但没处理全屏应用 Space（`visibleOnFullScreen: true` 已设，未实测）、缩放比不同的显示器之间移动。display-scope 会移动**真实**光标（HID），假光标在那一套里是否还显示需对照官方 **[抽]** |

---

## 7. 授权卡 UI 与 IPC

### 7.1 数据通路（request_access）

1. 工具 handler（agent-tools l.163）→ `cu.ask({reason, flags, apps, toolParams})`。
2. `main.cjs:767 computerUseAccessCard(session, access, ctx)`：给每个 app 取 Quick Look 图标（`apps.cjs appIconDataUrl`），组一个 **MCP 工具调用 elicitation**：`mcpServer/elicitation/request`，`_meta: {codex_approval_kind:"mcp_tool_call", persist:["session"], tool_params, computer_use_access:{reason, flags, apps}}`，走 `owner.localApproval(...)`（与核心的命令 / 文件审批同一条）。返回 `"accept" | "decline" | "unavailable"`。
3. 渲染：`src/approval-card-model.mjs:322–328` 用 `computerUseAccessRequest(params, item)`（`computer-use-model.mjs`）识别 → `mode: "computerUseAccess"`，`rows = computerUseAccessRows()`，标题 `computerUseAccessTitle()`；l.400 分支；l.678 ⌘↵ 只有一个 "Allow for this session"。
4. `src/source-approval-card.jsx:394–395` 标题用 `ComputerUseAccessTitle`，l.451 列表用 `ComputerUseAccessList`；l.527–535 变体 `computer_use_app_list`（⌘↵ 任意位置生效）。
5. 部件：`src/computer-use-approval-card.jsx`（`ZEe` 标题四变体 app / apps / capabilities / computer；`TT` 能力行；`GEe` 应用行含风险行与 tier）。风险集合 `SHELL_APPS / FILESYSTEM_APPS / SETTINGS_APPS` 在 `computer-use-model.mjs`（官方 `Pi` 逐字）。

**[抽]**：识别键是 `_meta.computer_use_access`；request_full_control 与 request_teach_access 需要各自的 `_meta` 键（或在 `computer_use_access` 里加 `kind`），并在 `approval-card-model.mjs` 加 `mode`。teach 卡官方是 `Ua`（GraduationCap、"Let Claude guide you step by step?"、Deny / Start guide，见 handoff）；全屏控制卡的官方 markup 需在 spec 文档里取。`computerUseAccessTitle` 已有 `kind:"computer"`（"use your computer"）变体，可能就是全屏控制的标题，需对照官方确认。

### 7.2 IPC（`desktop:call`，`main.cjs:2818–2828`）

| action | 需要 sessionId | 去向 |
|---|---|---|
| `computer-use:in-use` | 否 | `computerUseInUse.sessions()` |
| `computer-use:preview` | 是（`{sessionId, on}`） | `computerUsePreview.subscribe()` |
| `computer-use:probe` / `all-grants` / `revoke`（无 sessionId 时） | 否（全局） | `service.call()` |
| 其余 `computer-use:*` | 是 | `service.call()` |

事件（main → 渲染）：`{kind:"computer-use-in-use", sessions}`（main.cjs:435）、`{kind:"computer-use-preview", ...}`（preview.cjs）。渲染订阅点：`src/main.jsx:2717–2720`（停靠条）、`source-session-rail-computer-use.jsx`（`useInUse` / `useLivePreview`）。

---

## 8. 设置页

- `src/source-settings-computer-use.jsx`：`computerUseSettingsGroup()`（l.55）→ `{tab:"general", title:"Computer use", badge:"Beta", description, rows}`；开关 `agentComputerUse`；开着时追加 **Allowed apps**（本地扩展，样式照官方 Denied apps `Xr`）与 **Teach mode**（本地扩展，只有入口 + "此版本暂不可用"）。`useComputerUseGrants()`（l.18）调 `computer-use:all-grants` / `computer-use:revoke`。
- 挂载：`src/source-settings.jsx:32`（import）、`:361`（`useComputerUseGrants(desktopCall, tab==='general')`）、`:572`（组进 groups，`commit('computer-use-allowed-apps', …)`）。
- 存储：`main.cjs:3170` `config.agentComputerUse`，变化后 `agentTools.notifyListChanged()`。
- 官方差异（handoff 已记）：官方 `chicagoEnabled` 默认关且打开时有确认对话框；这里未设置读作开、没有对话框。**按用户决定不加 Denied apps。** 剪贴板 / 全屏控制在官方设置里有没有项需查 spec；teach 那一行目前是本地发明的空态。

---

## 9. transcript 显示

| 位置 | 作用 |
|---|---|
| `actions.mjs computerUseAction()` | 识别四种形态：`computerUse` item、Anthropic `computer` 工具、OpenAI computer use、computer-use MCP 服务器（工具名即动作）、本应用 `code_desktop` 上的 `OWN_COMPUTER_USE_TOOLS`。app_* 加 `scope:"app"`。**无前缀的 display-scope 名字（left_click / key / scroll / mouse_move / left_click_drag / screenshot …）已在 `KINDS` 里**，所以一旦注册到 code_desktop 并加入 `OWN_COMPUTER_USE_TOOLS`，transcript / in-use 自动认出（但见 §16.1 的命名冲突） |
| `KINDS` 缺的 | `switch_display`、`computer_batch`、`request_full_control`、`release_full_control`、`read_clipboard`、`write_clipboard`、`request_teach_access`、`teach_step`、`teach_batch`、`app_bring_to_current_space`、`list_granted_applications` 都没有 kind（`computerUseAction` 对它们返回 null → 不算步骤、不触发 in-use）**[抽]** |
| `src/computer-use-model.mjs` | `OFFICIAL_TOOLS`（display 名）/ `OFFICIAL_APP_TOOLS`（由 APP_KINDS 反推）、`computerUseToolName()`、`VERBS`（running / done / failed 三态，含 display 动作的 hold_key / move / mouse_down / mouse_up / cursor / open_app）、`ICON_KEYS`、`computerUseLabel()`、`keyLabel()`、`computerUseScreenshot()` |
| `src/source-computer-use.jsx` | `SourceComputerUseStep`（图标 + 动词 + 截图缩略图 `NH` + 图像查看器）；`SourceComputerUseBanner`（停靠条 `W`，Stop 调会话 stop，`main.jsx:6809`） |
| `src/source-session.jsx:894–896` | 渲染入口：`computerUseAction(item)` 为真就画 `SourceComputerUseStep` |
| `src/transcript-sdk-tools.mjs:87–88, 117` | `code_desktop` 的 CU 工具名 → `mcp__computer-use__<name>`；`computerUse` item → 官方工具名 |
| `src/file-tool-model.mjs:203`、`source-tool-group.jsx:77`、`approval-card-model.mjs:88–91` | 组摘要 "used the computer (N steps)"、组内忙碌标签、非 request_access 的 CU 审批标题 |
| 其它只认 item.type 的集合 | `transcript-rows-model.mjs:8`、`agent-model.mjs:8/80`、`transcript-runtime-stats.mjs:61`、`reasoning-model.mjs:12`、`turn-plan-model.mjs:64`、`source-transcript-tool-rows.jsx:36` |
| `src/source-session-rail-computer-use.jsx` | rail 卡：`isStep` 排除 request_access / release；实时帧或最后截图；`mode === "display"` 文案已就绪 |

---

## 10. `main.cjs` 接线速查

| 行 | 内容 |
|---|---|
| 388–389 | `agentToolGroupEnabled("computer-use")` |
| 395–404 | `computerUseSelfBundleIds`（读本应用 Info.plist，永不授权） |
| 406–412 | `computerUseAxHelper`、`computerUseImage.crop`（nativeImage → JPEG 75） |
| 413–416 | `computerUse = createComputerUse({..., pointer:{beforeClick → cursor.hideNow, clicked → cursor.pointAt}})` |
| 419–423 | `computerUseInUse`（isComputerUse / isRelease） |
| 424–443 | glow 变量、`computerUsePreview`、`computerUseGlowDisplay()`、in-use → 事件 + glow show/hide（标签 "{name} is using your computer"） |
| 527–531 | 延迟组（不含 computer-use） |
| 752–783 | `computerUseApps`、`agentTools.provide("computerUse")`、`computerUseAccessCard()` |
| 1272 | Reduce motion 变化 → `computerUseGlow.refreshMotion()` |
| 1359 | 每个核心事件 → `computerUseInUse.observe(e)` |
| 2096–2098 | app ready 后创建 glow / cursor |
| 2194、4209 | 窗口级处理排除 glow / cursor 窗口（主题背景、退出确认） |
| 2818–2828 | IPC |
| 3170 | `agentComputerUse` 设置写入 |
| 4216–4218 | 退出时 dispose |

---

## 11. 测试清单（`app/tests/`）

| 文件 | 条数 | 覆盖 |
|---|---|---|
| `computer-use-agent-tools.test.mjs` | 31 | 工具发现（与官方名单逐一比）、Ajv strict schema、annotations、无授权 → app_not_granted、request_access（一张卡 / Deny / unavailable）、授权后各工具真实路径、app_click 只走 AX、apps.cjs 解析与图标、transcript 认名、右键 / 双击 / 三击 / 空寻址 / 密码框、app_focus、app_menu、app_zoom、list_apps、app_batch（顺序 / mid-batch screenshot / 遇错即停）、ax-helper 信封、**"the 10 names without the capability yet"（`REASONED` 表 l.26–28，钉住 10 个占位的 reasonCode 且 native / helper 零调用）**、list_granted_applications、设置撤销 |
| `computer-use-ax-click.test.mjs` | 12 | policy fail-closed、executor（空白名单 / focused / retry）、app_screenshot 摘要、app_click 坐标换算与拒绝、右键 / 多击不走 raw、锁屏 / secure input、canvas、未知 reason |
| `computer-use-capture-contract.test.mjs` | 9 | 未授权不列不截、**captureScreen 的 allowlist / 排除校验**、foreign_pid、参数校验、IPC 信封、tier 分类、native loader |
| `computer-use-budget.test.mjs` | 6 | 预算常量、fit / scaled、坐标链（负原点） |
| `computer-use-type.test.mjs` | 11 | app_type AX → policy → rawType、secure input、退避、partial delivery、**app_key 的 service 路径（rawKey）**、native 分块 / 拒绝（需 build） |
| `computer-use-raw-input.test.mjs` | 11 | rawClick 梯级（policy 临时打开）、fail-closed、退避、raw_click_ineffective、EventFactory 唯一造事件、native rawClick 拒绝（需 build） |
| `computer-use-drag.test.mjs` | 11 | dragCoordinates（Retina 副屏）、参数 / 授权 / 截图 / tier、闸门顺序、mid-drag 不重放、readback 契约、Finder → system_app_ignores_posted_events |
| `computer-use-drag-native.test.mjs` | 2 | native drag 状态机、畸形请求（需 build） |
| `computer-use-event-source.test.mjs` | 2 | HID event source 探针（需 build） |
| `computer-use-glow.test.mjs` | 12 | glow 页逐字、show / hide / 代际、moveTo、显示器变化、**in-use 规则**、自身 bundle 不授权、**preview 每秒截窗口** |
| `computer-use-cursor.test.mjs` | 3 | pointAt / hideNow / service 的 pointer 钩子 |
| `computer-use-model.test.mjs` | 6 | 各形态归一、官方动词、app_* 映射、截图来源、组摘要、图标 |
| `computer-use-access.test.mjs` | 7 | 授权卡行 / 风险 / 标题变体 / 识别 / 卡模型 / zh-CN / ⌘↵ |
| `settings-computer-use.test.mjs` | 3 | 设置段、Allowed apps 芯片、Teach mode 空态 |
| `agent-tools-packaging.test.mjs`、`terminal-packaging.test.mjs` | — | `asar.unpackDir` 字面量含 `native/computer-use/build`（第二轮起不再有 `helpers/cu-ax/build`）；构建产物 unpack、源码不进包 |
| `approval-card-model.test.mjs`、`transcript-sdk-tools.test.mjs` | — | 间接覆盖 CU 卡与工具名映射 |
| Swift：`native/computer-use/Tests/ComputerUseCoreTests/`（含 `DragTests.swift`） | — | `swift test --filter` |

UI 脚本（真实应用 + fixture core，透明窗口）：`scripts/computer-use-ui-test.mjs`（`fixture:computer-use` 步骤行、停靠条、缩略图、工具组）、`scripts/computer-use-tools-ui-test.mjs`（code_desktop 截图行、授权卡、设置撤销与开关）。

---

## 12. live 测试与 fixture

| 文件 | 运行 | 碰什么 |
|---|---|---|
| `tests/computer-use-live-helpers.mjs` | — | `liveSkip`（无 `CU_LIVE=1` 跳过）、`native`、`FIXTURE` / `buildFixture` / `launchFixture`、`userInputFor` / `idleSeconds` |
| `tests/computer-use-click-live.test.mjs`（4） | `CU_LIVE=1 node --test --test-concurrency=1 …` | Finder 临时目录列表视图（右键 / no_menu_action）、TextEdit 临时文件（双击选词 / 三击选行；TextEdit 已在运行就跳过）；Finder 不在当前 Space 时临时拉前台再还原 |
| `tests/computer-use-type-live.test.mjs`（6） | 同上 | M3 文本 fixture + TextEdit 临时文件 |
| `tests/computer-use-drag-live.test.mjs`（4） | 同上 | TextEdit 拖选 10–40、Cocoa fixture、**System Settings 亮度滑块 30%→70% 并还原**、Finder 文件拖拽（允许报系统限制） |
| `tests/fixtures/cu-text-fixture/{main,noise}.swift` | live helpers 编译 | `dev.openclaude.cu-text-fixture`：忽略 AX 写入的 NSTextView、密码框、只读 label |
| `tests/fixtures/cu-drag-probe.swift`、`cu-drag-slider-probe.swift` | drag live | 拖拽探针 |
| `scripts/computer-use-m1-check.mjs` / `m2` / `m3` / `ax-tools-check.mjs` | `ELECTRON_RUN_AS_NODE=1 …/Electron scripts/…` | M1 截图、M2 点击、**M3 = M4 认证鼠标事件的验收脚本**（目前预期失败于 raw_click_ineffective）、app_menu / app_focus 实机 |

display-scope 的 live 测试目前**没有任何 fixture 或脚本**：需要能在不碰用户应用的前提下验证 hover 态、右键菜单、canvas 拖拽的自建窗口（可在 `cu-drag-probe.swift` 基础上扩）。

---

## 13. 打包（native / helper 相关）

- `package.json` scripts（第二轮起 `build:native` 只剩 `node native/computer-use/build.mjs`，`package` 去掉了 cu-ax 的 `--ignore` 与 unpackDir 项；以下为第一轮原文）：`build:native` = `node native/computer-use/build.mjs && node helpers/cu-ax/build.mjs`；`package` 先 `build` + `build:native`，electron-packager 参数含 `--ignore='^/native/computer-use/(?!build(/|$))'`、`--ignore='^/helpers/cu-ax/(?!build(/|$))'`、`--asar.unpackDir='{node_modules/node-pty/prebuilds,native/computer-use/build,helpers/cu-ax/build}'`。
- `native/computer-use/build.mjs`：`swift build -c release` → 复制 `libcomputer_use.dylib` 为 `build/computer_use.node`。
- ~~`helpers/cu-ax/build.mjs`~~：第二轮已删（并入 `computer_use.node`）。
- `scripts/sign-local.mjs`：逐个签 `computer_use.node`、（若有）`app-cu-helper`（第二轮起不再签 `cu-ax-helper`；`codesign --deep` 只把它们当资源）。
- 加载路径改写：`native.cjs` / `ax-helper.cjs` 把 `app.asar` → `app.asar.unpacked`。
- 测试：`agent-tools-packaging.test.mjs`、`terminal-packaging.test.mjs` 对 unpackDir 做**字面比对**——若 M4 新增 helper / 删 cu-ax，或 teach overlay 增加静态资源，两处都要改。

---

## 14. harness 侧 `APP_TOOL_NAMES`

- `harness/packages/acp-bridge/src/app-tools.js:21–37`：`Object.freeze([...])`，用途是"按名逐个列工具的 agent 规则"（Gemini Plan Mode policy、Qwen up-front tools），**漏名不影响调用**，只影响那些规则。
- l.32–36 已有 24 个 CU 名字。**注意 l.22/26 已含 preview 的 `screenshot`、`click`、`type`、`scroll`、`hover`、`find`**——display-scope 的 `screenshot` / `type` / `scroll` 在这里追加是重复项（无副作用），但这恰好暴露了 §16.1 的服务器内命名冲突。
- 按约束只追加名字（例如 `left_click`、`double_click`、`right_click`、`triple_click`、`middle_click`、`key`、`hold_key`、`left_click_drag`、`mouse_move`、`left_mouse_down`、`left_mouse_up`、`cursor_position`、`open_application`、`switch_display`、`zoom`、`wait`、`computer_batch`，以最终注册的为准）。

---

## 15. app_* 专用点清单（display-scope 复用前要抽出的）

按"能直接复用 / 需要抽象 / 必须新写"分三档：

**直接复用（无需改动）**
- `executor.deliver()`、`reason-policy.decide()`、`actionGate()` 的 secure / lock / typing 部分、`checkTier()`。
- `budget.fit / scaled / inFrame`、`checkBudget()`、`imageResult()`、`outcomeResult()`、`notYet()`、`serviceFailure()`。
- `service.captureScreen()`（只截已授权应用 + 壁纸）与 native `captureScreen`。
- native `drag`（已收屏幕点 `screenPt`）、`rawKey`（按 pid，display-scope 是否改为 HID 全局投递需按官方规格定）。
- glow（`moveTo(displayId)`）、in-use 的事件通路、停靠条、rail 卡的 `mode:"display"` 文案、授权卡外壳 `SourceApprovalCardView`。
- `computerUseAction()` / `KINDS` 里已有的 display 动作名和 `VERBS` / 图标。

**需要抽象（现在写死 app_*）**
1. **授权判定**：`checkGrant(ctx, app)`（agent-tools l.80）和 service 的 `granted()`（l.145）都以调用参数里的 bundleId 为准。display-scope 需要"命中点所属窗口的 owner / 前台应用 ∈ grants 且 tier 允许"——新闸门，放在 guards 里，需要 native 提供"点 → pid/bundle"（WindowList 已能列窗口，可在 JS 侧用 `listWindows` 结果做，也可以 native 化）。
2. **坐标参照**：`state.shots` 以 `bundle:window` 为键、`COORDINATE` schema 描述写死窗口帧像素、`frameToWindowLocal` / `windowLocalToScreen` 名字带 window、`dragCoordinates()` 依赖 `shot.bounds`。抽成"参照帧（window | display）+ 原点"的通用换算，display shot 存 `display:<id>`；补反向换算（cursor_position）。
3. **模式状态**：没有"全屏控制"状态。需要在 service（或 grants 旁）加 `fullControl: {held, displayId, grantedAt}`，被 request_full_control / release_full_control / switch_display 修改，供 in-use、glow、preview、list_granted_applications（`coordinateMode` 现写死 `"app_window"`，l.463）读取。
4. **in-use / preview / glow 的信号源**：in-use 现按"本轮有 CU 步骤"；preview `mode:"app"` 写死、只 `captureWindow(lastTarget)`；glow 显示器取本应用窗口所在屏。三处都要能读模式状态。
5. **batch 骨架**：`batch()` 的 `BATCH_TOOLS`、`screenshot(..., keepReference)` 写死 app_*；把"逐个调 handler / 遇错即停 / 图片附后 / mid-batch 截图不改参照"抽成通用函数，`computer_batch` 与 `teach_batch` 复用。
6. **拒绝文案**：`NEXT_STEPS` / `REASON_STEPS` / `RAW_PATH_STEP` / `BUILD_SCOPE` 大量写死 "app_screenshot / app_menu"；display-scope 的拒绝需要自己的 next_step（例如指回 `screenshot`）。
7. **授权卡识别**：`_meta.computer_use_access` + `mode:"computerUseAccess"`；全屏控制卡、teach 卡要新的 `_meta` 键与 mode。
8. **tier op**：`ALLOWED` 缺 move / mouse_down / mouse_up / hold_key / cursor / open_app / switch_display 等 op。
9. **假光标钩子**：`pointer` 只在 `appClick` 成功后调用；display-scope 若保留假光标，需在所有指针动作后调用，并与真实光标移动的关系对齐官方。

**必须新写**
- native：scroll（AX 设滚动条 + 事件）、mouse move / down / up、key down/up（hold_key）、全局 HID 投递（display-scope 的语义，能到 hover 态、右键菜单、canvas 拖拽）、剪贴板读写（或 JS 侧用 Electron `clipboard`，需先定授权模型）、跨 Space 移窗（私有 SkyLight）、光标位置。
- 工具：display-scope 一整套 + 模式开关 + 对应授权卡；teach overlay（官方 `cu-teach-*.html` panel）；目标窗口高亮层。

---

## 16. 风险与冲突（实施前必须决定）

1. **工具名冲突（最关键）**：`electron/agent-tools/preview.mjs` 在同一个 `code_desktop` 服务器上已注册 `screenshot`（l.130）、`type`（l.185）、`scroll`（l.304）。host 按文件名字母序加载、同名先到先得：若把 display-scope 的 `screenshot` / `type` / `scroll` 加进 `computer-use.mjs`，**computer-use.mjs 先加载，会把 preview 的三个工具挤掉**（只 warn）。同时 `actions.mjs ownComputerUseTool()` 只按名字判断，加入 `OWN_COMPUTER_USE_TOOLS` 后 preview 的调用也会被当成 CU 步骤（触发 in-use、光晕、停靠条）。官方是两个独立 MCP 服务器（`computer-use` 与 `Claude_Preview`），所以没有这个问题。可选方向：(a) host 支持第二个服务器名（例如 `computer-use`），transcript 映射已经是 `mcp__computer-use__*`；(b) display-scope 用别名（与"官方名一致"的目标冲突）；(c) preview 关闭时才注册（不可行）。**现状（已定，照官方语义、不改名）**：保留同一个 `code_desktop` 服务器，`agent-tools-host.cjs` 的 `sharesName` + `prefersSharedTool` 按会话挑（会话有已授权应用 → computer use 版，否则 preview 版），调用按该连接最后一次 tools/list 派发；见交接第一节与第八节 2。
2. **`systemKeyCombos` flag 无效**：授权卡会问它、grants 会记它，但 `service.appKey` 的 `SYSTEM_COMBOS` 一律拒，与 flag 无关。接 app_key 时要定：flag 授了是否放行。
3. **app_key 的 service 已有**：`appKey`（l.451）走 `rawKey`（`CGEventPostToPid` 键盘事件）；handoff 记"键盘 postToPid 被接受"，但后台 key window 需要实验二（`SLPSSetFrontProcessWithOptions` options 值，`// VERIFY`）。所以 app_key 接线本身是 JS 小改（handler 调 `appKey` + `outcomeResult`），风险在 native 实验。
4. **app_scroll 在 service 无方法、native 无方法**；handoff 计划"先 AX 设 AXValue，再认证事件"。
5. **剪贴板**：工具层把它归为 display-scope（`clipboardRefusal` 有 flag 后仍 not_supported_in_build）。`type` 的剪贴板快速路径（pbcopy + ⌘V 的等价物）会覆盖用户剪贴板，需决定是否保存 / 恢复，以及是否要求 clipboardWrite flag。
6. **拒绝形状不统一**：`failure()`（l.33）返回 `{ok:false, error:{code, message, next_step}}`（无 outcome / reasonCode），而 `notYet()` / `outcomeResult()` 是 `{ok:false, outcome, reasonCode, message, next_step}`。硬约束要求统一后者；现有测试大量断言 `error.code`（例如 app_not_granted），迁移需同步改测试。
7. **授权只在内存**：应用重启即丢；全屏控制的批准是否同样会话内、是否持久，需按官方。
8. **假光标窗口与命中测试**：display-scope 用 HID 投递时，假光标 / 光晕窗口虽然鼠标穿透，但 `hideNow()` 只在 appClick 前调用；新路径也要保证命中测试不落在它们上。

---

## 17. 非真实结果工具：各自在哪里返回占位

> **现状：0 个占位。** 下表 10 个（加第 11 条 app_drag 系统应用）都已改为真实实现或照官方的受限结果，
> 位置见 §1.2 现状列：app_key / app_scroll / request_full_control / release_full_control / read_clipboard / write_clipboard /
> request_teach_access / teach_step / teach_batch 真实；app_bring_to_current_space 受限（跨进程移 Space → `op_unavailable`）；
> app_drag 系统应用 → `drag_ineffective`。`app_batch` 的 key / scroll 步走真实实现；Finder 行点击走官方 AX 梯子；
> 设置页 Teach mode 行反映真实权限状态；display-scope 一整套**已注册**（§1.2 表后）。以下为开工时的原文，仅作历史记录。

用户说的"11 个"是 handoff 早期口径（当时 app_drag 也是 `requires_raw_path`）。HEAD 上 app_drag 已走事件路径，**纯占位是 10 个**（测试 `computer-use-agent-tools.test.mjs:26–28 REASONED` 与 l.726 的用例名 "the 10 names" 一致）；第 11 个可算作 app_drag 在系统应用上的"已投递但无效"。

| # | 工具 | 返回点（`electron/agent-tools/computer-use.mjs`） | reasonCode | 背后已有 / 缺什么 |
|---|---|---|---|---|
| 1 | app_key | l.479 `rawPathRefusal("A key press")` → l.658 | requires_raw_path | `service.appKey`（l.451）+ native `rawKey` 已有；缺后台 key window 方案（实验二） |
| 2 | app_scroll | l.492 `rawPathRefusal("Scrolling")` | requires_raw_path | service / native 都没有 |
| 3 | app_bring_to_current_space | l.528 `rawPathRefusal(...)` | requires_raw_path | 都没有（私有 SkyLight） |
| 4 | request_full_control | l.536 `notInBuild(...)` → l.663 | not_supported_in_build | 没有模式状态、授权卡、锁 |
| 5 | release_full_control | l.544 `notInBuild(...)` | not_supported_in_build | 同上 |
| 6 | read_clipboard | l.552 `clipboardRefusal(ctx,"clipboardRead")` → l.668：无 flag → permission_denied；有 flag → not_supported_in_build | permission_denied / not_supported_in_build | flag 与授权卡行已有；读取实现没有 |
| 7 | write_clipboard | l.560 同上（clipboardWrite） | 同上 | 同上 |
| 8 | request_teach_access | l.573 `notInBuild("Teach mode")` | not_supported_in_build | 没有授权卡 / overlay |
| 9 | teach_step | l.591 `notInBuild("Teach mode")` | not_supported_in_build | schema 已有 |
| 10 | teach_batch | l.618 `notInBuild("Teach mode")` | not_supported_in_build | schema 已有 |
| (11) | app_drag @ Finder / Dock / SystemUIServer | `service.cjs:125 dragReadback()`（`POSTED_EVENT_SYSTEM_APPS` l.111） | ineffective + system_app_ignores_posted_events | 投递方式要换认证事件（native `Dispatcher.swift` postToPid 调用点） |

间接落到占位的路径：
- `app_batch` 的 `key` / `scroll` 步：l.623 `BATCH_TOOLS` 映射到 app_key / app_scroll 的 handler → 同样返回 requires_raw_path 并停住 batch（测试 l.694 钉住）；l.646 找不到工具时也落 `rawPathRefusal(action)`。
- `app_click` 左键单击在 Finder 列表行：`axOnly:true`（l.275）+ `no_press_action` 在 PLANNED_M3 → `unsupported` / `no_press_action`（真实拒绝，不是占位，但同属"系统应用点击无效"）。
- 设置页 Teach mode 行：`source-settings-computer-use.jsx:66`（纯文案空态）。
- 官方另有、本分支**未注册**的 display-scope 名字（computer_batch、open_application、switch_display 以及 screenshot / left_click / … 一整套）：不在 24 个之内，调用即"工具不存在"。
