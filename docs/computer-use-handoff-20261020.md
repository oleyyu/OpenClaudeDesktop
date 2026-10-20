# 交接：Computer Use 工具注册（M5 最后一块）

2026-10-20。分支 `ui-next`，基于 `e117a8d`（M3）与 `1accd81`（M5 UI）。模型从这一轮起能真正调到 computer use。

## 落点

| 文件 | 职责 |
|---|---|
| `app/electron/agent-tools/computer-use.mjs` | 新增。group `computer-use`，七个工具的 schema、描述与 handler；授权检查与结构化错误都在这里 |
| `app/electron/computer-use/apps.cjs` | 新增。request_access 的应用名 → bundle（应用目录、Spotlight、plutil），授权卡图标（Quick Look 缩略图） |
| `app/electron/computer-use/service.cjs` | 加 `axFind`、`release`，`appClick` 加 `axOnly`（工具层关掉 raw 梯级） |
| `app/electron/main.cjs` | `agentTools.provide("computerUse")`，把已有的 `createComputerUse` 实例与授权卡接进去 |
| `app/electron/computer-use/actions.mjs`、`in-use.cjs` | 认出 `code_desktop` 服务器上的这七个工具；`app_release` 完成即交还电脑（光晕、停靠条熄灭） |
| `app/src/transcript-sdk-tools.mjs`、`computer-use-model.mjs`、`source-session-rail-computer-use.jsx` | transcript 用官方 `mcp__computer-use__*` 名字画行；release 的动词；release 不算步骤 |
| `app/electron/i18n/zh-CN/computer-use.mjs` | release 三个动词 |
| `app/tests/computer-use-agent-tools.test.mjs` | 新增单测（发现、Ajv、授权、卡片、AX-only、apps.cjs、transcript） |
| `app/scripts/computer-use-tools-ui-test.mjs` + `tests/fixtures/codex-server.cjs` | 新增 UI 脚本与 fixture 命令 `fixture:computer-use-app`、`fixture:app-tool <name> <json>`；窗口透明且鼠标穿透，不占屏幕 |

`harness/` 只动了一处：`packages/acp-bridge/src/app-tools.js` 的 `APP_TOOL_NAMES` 加上这七个名字（用户 2026-10-20 同意；Gemini Plan Mode 里它们和其他 app 工具一样是 ask_user，Qwen 里在 tool_search 后面）。没碰 `app/native/`，没碰 `app/public/build-info.json`（打包会重写它，两次打包后都按原内容还原）。

## 已开放的工具与能力边界

字段名取自 `claude-cu-spec/docs/02-tools.live.json`（`app`、`window_id`、`coordinate`、`element_index`、`target`、`scale`、`button`、`count`、`mode`、`action_summary`），handler 里映射到 service 的 `bundleId` / `windowId`。除 request_access 与 app_release 外，每个工具进门先查授权表；没授权、参数冲突、native 报错都返回 `{ok:false, error:{code, message, next_step}}` + `isError`，不抛异常。

| 工具 | 能做 | 不做 / 边界 |
|---|---|---|
| `request_access` | 一张授权卡（复用 M5 的 `computer-use-approval-card.jsx`，经 `localApproval` 发 elicitation），全有或全无；应用可写名字或 bundle id；返回 `granted` / `denied`（`user_denied` / `not_installed` / `not_grantable`）/ `flags` / `screenshotFiltering: "granted_apps_only"` | 同一会话已授权的应用与 flag 不再弹卡；卡显示不了返回 `approval_unavailable`，不授权。授权只在内存里，**应用重启后失效** |
| `app_list_windows` | 授权应用的窗口列表（native `listWindows` 原样） | readOnly。包含辅助窗口（见已知限制） |
| `app_screenshot` | 窗口图 + AX 摘要（`[N] role "title" (x, y, w×h)`），成为该窗口的坐标基准；`scale` 0.1–1、默认 1，只缩返回图 | readOnly。只截授权应用的窗口 |
| `app_ax_find` | 在上次 app_screenshot 的摘要里按 role（带不带 AX、不分大小写，也匹配 subrole）与标题子串查 `[N]` | readOnly。不重新读应用；没截过图返回 `screenshot_required` |
| `app_click` | **只走 AX**：AXPress，向上找四层父元素；寻址 `coordinate` / `element_index` / `target:"focused"` 三选一，handler 里先拒互斥，不让 native 猜 | `axOnly: true`：即使 reason policy 给出 fallback 也不发 raw 点击（单测用强制 fallback 的 policy 验证过）；按不到就是 `unsupported` + reasonCode，不盲点 |
| `app_type` | AX 先写 AXValue 并读回；policy 的 FALLBACK（`no_focused_text` / `text_not_writable`）才降级到 raw Unicode 键入；`mode: insert / replace`，replace 走已有选中逻辑 | 没有官方的 `disable_substitutions` / `overwrite_existing`（service 没实现，不发明）；部分送达返回 `deliveredPrefixChars` |
| `app_release` | 忘掉本会话对某应用 / 窗口 / 全部的截图、上次点位、预览目标；完成即交还电脑 | 不撤销授权；`window_id` 不带 `app` 报 `invalid_params` |

## 未开放的工具

| 工具 | 原因 | M4 通过后怎么补 |
|---|---|---|
| `app_scroll` | 依赖 M4 的事件落地：AX 只能设滚动条值，滚轮事件要 raw 投递，而 Finder 这类应用丢弃 `CGEventPostToPid` 鼠标事件 | M4 实验一通过后在 service 加 `appScroll`（先 AX 设 `AXValue`，再走认证事件），工具层照 app_click 的模式接 |
| `app_drag` | 同上，拖拽只能 raw，且要途经点采样 | 同上，`appDrag` + `path` 2–20 点；先用 M3 文本 fixture 与 Finder 列表验证 |
| `app_key` | 未验证：`service.appKey` 已有（raw 键入、系统组合键拒绝），但没有过验收；后台应用不在前台时 AppKit 会丢键盘事件，要 M4 的 key window 伪造 | M4 实验二定下 options 值后，跑一遍 TextEdit / Finder 的按键验收再开 |
| `app_menu` | 未实现：service 没有 AXMenuBar 的走查 | 新写 `appMenu`（path / list），纯 AX，不依赖 M4，可以先做 |
| `app_batch` | 未实现：没有批处理执行器 | 在已开放工具之上做顺序执行、遇错即停、坐标指向批前截图；等 scroll/drag/key 齐了再开 |

## 已知限制

- **Finder 这类系统应用忽略投递的鼠标事件。** 2026-10-19 实测：Finder 列表行没有 AXPress，`CGEventPostToPid` 的鼠标事件在各种字段组合下都被丢弃（AXSelected 读回不变），真实 HID 点击才生效。所以 `no_press_action` 留在 PLANNED，工具层又加了 `axOnly`。
- **raw 路径目前只在 fixture 上验证过。** `no_focused_text` / `text_not_writable` 两个 fallback 只在 M3 文本 fixture（`tests/fixtures/cu-text-fixture`）上见过；真实应用里的 raw 键入还没有验收记录。
- 授权在内存里，应用重启后要重新 request_access（真机上重启后同一会话会再弹一次卡）。
- `app_list_windows` 会列出辅助窗口：Finder 真机返回主窗口 133 之外还有 4 个 1470×33 的菜单栏层窗口和一个 64×64 小面板，`is_main` / `is_minimized` / `is_off_space` 为 null。官方工具只列了主窗口。过滤要改 native，本轮没动。
- 窗口标题可能陈旧：Finder 133 标题报 `Desktop — Local`，画面是 Downloads。
- transcript 行字是官方的通用 MCP 措辞（`Used computer-use: app screenshot`），不是 `Captured window`，与 `computer-use-ui-test.mjs` 头注里说的官方行为一致。
- `app.getFileIcon` 在 macOS 27 上对所有应用都返回通用模板图标（网格），授权卡改用 Quick Look 缩略图。
- 七个工具不在延迟加载组里，支持 deferAppTools 的核心也会一直列出。

## 验收记录

1. **发现测试**：通过。host 从工具目录发现恰好七个、组开关能整组关；七个 inputSchema 在 Ajv strict 下编译通过，合法 / 非法参数各自通过 / 拒绝（`tests/computer-use-agent-tools.test.mjs`，11 条）。
2. **列出 Finder 窗口（真机，DeepSeek Harness）**：通过。模型先调 app_list_windows 得到 `app_not_granted` + next_step，自己转去 request_access；允许后返回真实数据，主窗口 133 的位置尺寸 (124, 192) 920×436 与官方 computer-use 工具的基线一致。
3. **截 Finder 的图（真机）**：通过。1840×872 帧（920×436 的 2×），模型对 Downloads 列表的描述与图一致；transcript 里展开该行可见摘要与 1568×743 的图（经 CDP 读真实应用 DOM 确认）。
4. **未授权调 app_click**：通过，无界面。真实 host + 真实 native 模块，四种寻址都返回 `app_not_granted`，next_step 指向 request_access，不抛异常，native 零调用。
5. **授权卡只问一次**：通过，透明窗口不占屏幕。卡片按 bundle id 列 Finder（图标、文件系统风险、All），允许后同一会话再 request_access 不弹卡，app_list_windows 随即可用（`scripts/computer-use-tools-ui-test.mjs`）。
6. **npm test**：RESULT_LINE
   - 新增失败 0 条。第一轮跑出的 `app-tool-names-sync`（HEAD 上通过，因新加七个工具而失败）已在 harness 的 `APP_TOOL_NAMES` 补上名字后通过；harness 的 npm test HARNESS_LINE。
   - 既有失败 1 条：`view-tabs-manifest` 的 “host code imports view-tab modules only through semantic public names”（`src/generated/code-routines/c003a371e-BOPgOKRl.mjs` 从 `shared-25` 导入 `mp`），HEAD 上同样失败，来自 `8c6ae46`，未动。

## 下一步：M4 探针的两个实验

两个都先在探针脚本里跑，不进 service；全部在 feature flag 后面，默认关。

**实验一：认证鼠标事件能不能落到 Finder。** 就是那个两分钟的 Finder 实验，`app/scripts/computer-use-m3-check.mjs` 已经写好检查，缺的是投递方式：按 docs/05 §一，用 `SLEventSetAuthenticationMessage` 给事件挂认证信封，再 `SLPostEventRecordTo` 送给 Finder 的 PSN，目标是 Finder 列表视图里一行（`no_press_action` 的场景），Finder 在后台、另一应用在前台。

- 通过：连续 10 次，每次 AXSelected 读回 false → true；每次前后 `lsappinfo front` 不变；真实光标位置不变；没有窗口被抬起。
- 失败：任何一次前台变了，或读回不变。前台变了直接判死（违反后台控制的前提），读回不变可以换字段组合再试，但每组都要记录。
- 通过就开 `app_scroll` / `app_drag` 的实现，并把 `no_press_action` 从 PLANNED 移到 FALLBACK。

**实验二：key window 伪造的 options 值。** docs/05 §一的 `SLPSSetFrontProcessWithOptions(&psn, windowId, options)`，`options` 社区取值 `0x200`（不抬升）/ `0x100`（仅前窗），代码里是 `// VERIFY`。目标是 TextEdit 一个文档窗口在后台，另一应用在前台：伪造 → 送 Unicode 键盘事件 → AXValue 读回 → end 时把前台还回去。

- 每个候选值跑 20 次，期间每 50 ms 采样一次 `SLPSGetFrontProcess` 与 `lsappinfo front`。
- 通过：用户可见前台 0 次变化；`activated` 恒为 false；文字 ≥ 19/20 次完整读回；end 后前台与开始一致。
- 两个值都不满足就不开 `app_key` 的后台键入，记录现象回到 docs/05。
- 通过就把选中的值写进 native 常量并去掉 `// VERIFY`，再跑一遍 M1–M3 的测试确认 flag 关时没有影响。
