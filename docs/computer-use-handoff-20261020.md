# 交接：Computer Use 工具面（与官方 24 个名字对齐）

2026-10-20。分支 `ui-next`。上一轮开放了七个工具（`16d3b5e`，补提交）；本轮按"工具面和官方一致、能力差异用 reason code 表达"推进，四组各自一个提交：

| 提交 | 内容 |
|---|---|
| `361bba3` | 三个矛盾：app_click 右键 / 多击 → `requires_raw_path`；空寻址报错（不再重放上次点击）；密码框 → `no_text_target` |
| `05ab34d` | 纯 AX 工具：app_focus、app_menu、app_zoom、list_apps、app_batch（Accessibility helper 在 native/ 之外） |
| `62cf487` | 24 个官方名字全部注册；没有能力的返回 `requires_raw_path` / `not_supported_in_build` / `permission_denied` |
| `503f29a` | UI：设置 › System › Computer use（开关、已允许应用 + 移除、Teach mode 入口）、点击位置的假光标 |

## 工具可用数：24 / 24 已注册，13 个返回真实结果

| 状态 | 工具 |
|---|---|
| 真实结果（13） | request_access、app_list_windows、app_screenshot、app_ax_find、app_click（仅左键单击）、app_type、app_release、**app_focus、app_menu、app_zoom、list_apps、app_batch、list_granted_applications** |
| `requires_raw_path`（4） | app_key、app_scroll、app_drag、app_bring_to_current_space |
| `not_supported_in_build`（5） | request_full_control、release_full_control、request_teach_access、teach_step、teach_batch（结果带 `build` 字段说明本分支的范围） |
| `permission_denied` → request_access（2） | read_clipboard、write_clipboard：没有 clipboardRead / clipboardWrite 授权时返回它，next_step 指向 `request_access` 带对应 flag；**有授权后**返回 `not_supported_in_build`（官方把剪贴板算全屏控制，本分支没有） |

任务清单列了 23 个名字，第 24 个取官方 live 清单里的 `list_granted_applications`（会话授权、flag、`coordinateMode: "app_window"`），这样"7 现有 + 5 新增 + 1"正好 13 个真实结果。官方 live 清单另有 computer_batch、open_application、switch_display 三个全屏工具，没注册。

所有拒绝都是 `{ok:false, outcome:"unsupported", reasonCode, message, next_step}` + `isError`，不再有泛泛的 `unsupported`。描述是自己写的，没照抄官方英文。

## 本轮的行为改动

- **app_click**：`button:"right"` 或 `count:2/3` 在 handler 入口返回 `requires_raw_path`（参数保留在 schema，描述写明"当前构建只支持左键单击"），删了"never sends a synthetic mouse click"。三个寻址参数全空 → `invalid_params`；service 里"重放上一次点位"的分支与 `state.points` 一起删了。
- **app_type**：写入前读 role。element_index 读截图摘要的 role/subrole，coordinate 取摘要里包含该点的最小元素，是 `AXSecureTextField` 就直接 `no_text_target` + `secureTextField: true`，native 零调用（不全选）。`target:"focused"` 时 JS 看不到 role：native 的目标解析在全选之前就把密码框拒成 `secure_input_active`（TextInput.swift:95，没改），service 再探一次 probe，没开 secure input 就改写成 `no_text_target`；真的有 secure input（别的应用的密码框）仍是 `secure_input_active`。live 测试 `computer-use-type-live` 验收 2 跟着改了断言（CU_LIVE 才跑，本轮没跑）。
- **app_focus**：AXMain + AXFocused，不 AXRaise、不激活；目标应用在前台时拒绝（`app_is_frontmost`，照官方），最小化窗口 `window_minimized`。成功后该窗口成为这个应用的默认窗口（和 app_screenshot 一样），所以随后的 `target:"focused"` 有窗口可指。官方 app_focus 还收 coordinate / element_index（聚焦某个元素），本轮按任务只做窗口。
- **app_menu**：`path` / `list` / `close` 三选一。path 走 AXMenuBar 逐级按标题匹配（不分大小写、忽略尾部 … / ...），最后一项 AXPress：命令项执行；菜单标题打开菜单并返回子项。`list`（true / null / 标题 / 路径）只读。`close: true` 对打开的菜单 AXCancel（Escape 的等价物，任务验收要"Escape 关闭"，而 app_key 没开）。匹配失败 `menu_item_not_found` + `closestMatch`（编辑距离）+ `available`；disabled `menu_item_disabled`。列举在任何级别都行，按菜单要 full 级别。
- **app_zoom**：从该窗口最近一次 app_screenshot 的图里裁剪（帧像素 → 图像像素），放大到区域的帧尺寸（受截图预算约束）；没截图 `screenshot_required`。不重新截图，所以细节上限就是那张截图（真正的高清 zoom 需要 native 支持全分辨率截取）。
- **list_apps**：不需要授权；运行中的在前并带 pid；已安装的来自 apps.cjs 同一组目录；query 没匹配时回落到 apps.cjs 的 `resolve()`（Spotlight），即与 request_access 同一套名称解析；`cursor` 是偏移量字符串。每项带本会话的 `granted` / `tier`。
- **app_batch**：每个 action 调现有 handler（click → app_click …，key/scroll/drag 走它们的占位工具），遇错即停（包括 ineffective；官方是 ineffective 不停，这里按任务"遇错即停"）。batch 中途的 screenshot 用 `keepReference`：只拿图、不列元素、不写状态、不碰 native 的 SummaryCache，所以 batch 内的坐标与 element_index 始终指向调用前那张截图。最多 20 步。

## Accessibility helper（native/ 之外）

native 模块没有暴露窗口焦点、菜单栏和应用枚举，而本轮不能碰 `app/native/`。JXA 的 ObjC 桥调 AX 的 CF 出参不可用（`Ref has incompatible type`），所以另写了一个独立 Swift 小程序：

- `app/helpers/cu-ax/main.swift` → `build/cu-ax-helper`（`node helpers/cu-ax/build.mjs`，已并进 `npm run build:native`；build/ 不入库）。一次调用一个进程，stdin 一个 JSON、stdout 一行 JSON。方法：probe、focus、menu、menuList、menuClose、apps。
- `app/electron/computer-use/ax-helper.cjs` 包装；没编译出来时每个调用返回 `helper_unavailable`，不致命。
- 子进程的辅助功能使用记在 app（responsible process）名下，实测 `axTrusted: true`。
- 打包：`package` 脚本加了 `--ignore='^/helpers/cu-ax/(?!build(/|$))'`，unpackDir 加 `helpers/cu-ax/build`；`sign-local.mjs` 签 `cu-ax-helper`；`agent-tools-packaging.test.mjs` 加了一条。**本轮没有实际打包验证。**
- M4 之后这些方法应该并回 native 的 dispatcher（Bridge.swift），helper 删掉。

## harness 改动

`packages/acp-bridge/src/app-tools.js` 的 `APP_TOOL_NAMES` 只追加了 17 个名字（app_focus … teach_batch），共享逻辑没动。app 侧的名单收拢成 `actions.mjs` 的 `OWN_COMPUTER_USE_TOOLS` 一处（transcript-sdk-tools 也从这里读）。harness 的 npm test：717 过 / 1 失败（`official MCP services: identity headers …`，去掉本轮改动后同样失败，既有问题）。

## UI

- **设置 › This computer › System › Computer use**（`src/source-settings-computer-use.jsx`）：位置、标题 + neutral Beta 徽标、段落说明、"Enable computer use" 开关照官方 2.42304.0（c71860c77 `ii`）。开关存 `config.agentComputerUse`，关掉后 `agentToolGroupEnabled("computer-use")` 为假、工具列表重新下发；**未设置读作开**（与 Visuals 一致；官方 `chicagoEnabled` 默认关、打开时还有一个确认对话框，本轮没做）。分组渲染加了 `badge` / `description` 两个可选字段。
- **已允许的应用**：官方设置里**没有**这一项（官方授权只在会话内，设置里只有 Denied apps）。按任务要求做了，标记和样式完全复用官方 Denied apps 块（`Xr`）：`flex flex-wrap gap-1.5` 芯片、ghost xxs X 按钮、`text-footnote text-secondary` 空态。移除 = 从所有会话撤销该应用并释放其窗口状态（service `revoke` / IPC `computer-use:revoke`、`computer-use:all-grants`）。这是本地扩展，若要严格对齐官方应改成 Denied apps。
- **Teach mode**：只有一行入口与"此版本暂不可用"的空态。官方没有这个设置入口，teach 只有 request_teach_access 的授权卡；这一行同样是本地扩展。
- **假光标**（`electron/computer-use/cursor.cjs`）：透明、鼠标穿透、screen-saver 层级的 40×40 panel BrowserWindow，箭头 + 一圈 clay 色脉冲，移到点击的全局屏幕坐标，2 秒后 0.3 秒淡出。**是 Web 近似，不是一致**：官方是原生 `ComputerUseSwift.PhantomCursor`（NSPanel），只在 click 时 pulse、在锁释放时隐藏而不是定时淡出，尺寸 / 时长常量编译在 Swift 里读不到。每次点击前先 `hideNow()`，保证 AX 命中测试不会打到光标窗口；app 自身从不被授权，截图也不会包含它。

## 未实现项与 M4 依赖清单

| 项 | 依赖 | M4 后怎么补 |
|---|---|---|
| app_click 右键 / 双击 / 三击 | raw 鼠标事件投递（Finder 丢弃 CGEventPostToPid 鼠标事件） | 实验一通过后去掉 handler 入口的拦截，service 已有 rawClick 梯级；`multi_click_needs_raw_input` 进 FALLBACK |
| app_scroll | 同上；AX 只能设滚动条值 | service 加 `appScroll`（先 AX 设 AXValue，再认证事件），占位 handler 换成真实的 |
| app_drag | 同上，需途经点采样 | `appDrag` + path 2–20 点 |
| app_key | 后台 key window 伪造（实验二），`service.appKey` 已有但未验收 | 实验二定下 options 后接 `service.appKey`；batch 的 key 步自动生效 |
| app_bring_to_current_space | 跨 Space 移窗 / 取消最小化（私有 SkyLight 调用） | native 新方法，handler 照 app_focus 的模式 |
| request/release_full_control、read/write_clipboard | 全屏控制（显示器锁、全屏截图坐标），本分支范围外 | 需要单独的全屏控制设计；剪贴板在那之后按授权 flag 放开 |
| teach 三件套 | raw 路径 + teach overlay（官方 `cu-teach-*.html` panel） | M4 之后做授权卡（官方 `Ua`：GraduationCap、"Let Claude guide you step by step?"、Deny / Start guide）和 overlay |
| helper 并回 native | M4 会话结束、native 可改 | focus / menu / apps 搬进 Bridge.swift，删 `helpers/cu-ax` |
| app_zoom 高清 | native 全分辨率截取 | captureWindow 加不缩放的区域截取 |
| app_type `target:"focused"` 的密码框 | 现在靠 native 的拒绝码改写 | native 直接返回 `no_text_target`（TextInput.swift:95）后删掉 service 里的改写 |

## 已知限制

- **Finder 这类系统应用忽略投递的鼠标事件。** 2026-10-19 实测：Finder 列表行没有 AXPress，`CGEventPostToPid` 的鼠标事件在各种字段组合下都被丢弃（AXSelected 读回不变），真实 HID 点击才生效。所以 `no_press_action` 留在 PLANNED，工具层又加了 `axOnly`；app_click 的右键 / 多击在 handler 入口就返回 `requires_raw_path`。
- **raw 路径目前只在 fixture 上验证过。** `no_focused_text` / `text_not_writable` 两个 fallback 只在 M3 文本 fixture（`tests/fixtures/cu-text-fixture`）上见过；真实应用里的 raw 键入还没有验收记录。
- 授权在内存里，应用重启后要重新 request_access（真机上重启后同一会话会再弹一次卡）。
- `app_list_windows` 会列出辅助窗口：Finder 真机返回主窗口 133 之外还有 4 个 1470×33 的菜单栏层窗口和一个 64×64 小面板，`is_main` / `is_minimized` / `is_off_space` 为 null。官方工具只列了主窗口。过滤要改 native，本轮没动。
- 窗口标题可能陈旧：Finder 133 标题报 `Desktop — Local`，画面是 Downloads。
- transcript 行字是官方的通用 MCP 措辞（`Used computer-use: app screenshot`），不是 `Captured window`，与 `computer-use-ui-test.mjs` 头注里说的官方行为一致。
- `app.getFileIcon` 在 macOS 27 上对所有应用都返回通用模板图标（网格），授权卡改用 Quick Look 缩略图。
- 24 个工具都不在延迟加载组里，支持 deferAppTools 的核心也会一直列出（比上一轮多 17 个 schema 进上下文）。

## 本轮验收记录

1. **24 个工具名都能在 host 发现**：通过。`computer-use-agent-tools.test.mjs` 的发现测试从默认工具目录列出全部 24 个，与官方名单逐一比对；24 个 inputSchema 都在 Ajv strict 下编译，合法 / 非法参数各自通过 / 拒绝。
2. **13 个返回真实结果**：通过（单测）。另 11 个各自返回约定的 reasonCode 与 next_step，native 与 helper 零调用。
3. **三个矛盾清零**：通过（单测）。right / count 2 / count 3 → `requires_raw_path`；空寻址 → `invalid_params` 且不重放；密码框（element_index、coordinate、focused 三种寻址）→ `no_text_target`，前两种 axType 零调用。
4. **app_focus 后 `target:"focused"` 在无焦点窗口上成功**：真机通过（`scripts/computer-use-ax-tools-check.mjs`，Electron as Node，前台是微信）。TextEdit 后台开 a.txt、b.txt（b 有焦点）；对 a.txt 用 focused 输入先被拒（`anotherWindowIsOnTopAtThePressPoint`）；app_focus a.txt → `focused: true, activated: false`；再输入 → `outcome ok, verified, path ax, windowId` 为 a.txt；TextEdit 始终没到前台，脚本结束后退出。
5. **app_menu 在 Finder 上开菜单、列子项、Escape 关闭**：真机通过（同一脚本）。Finder 在后台：list 得到 8 个菜单栏标题；`path:["file"]` 打开 File（`open: true`）并列出子项（含 disabled 标记）；前台未变；`close` 关掉 1 个、再 close 为 0；`["Fiel"]` → `menu_item_not_found`、`closestMatch: "File"`。
6. **npm test**：5703 条，5682 过 / 19 跳过（CU_LIVE 等实机测试）/ 2 失败。
   - 新增失败 1 条，已修：`terminal-packaging` 按字面比对 unpackDir，加了 `helpers/cu-ax/build` 后不匹配，改了期望值后通过（单跑 terminal / agent-tools packaging 7/7）。
   - 既有失败 1 条：`view-tabs-manifest` 的 “host code imports view-tab modules only through semantic public names”，HEAD 上同样失败，来自 `8c6ae46`，未动。
   - 新增测试：`computer-use-agent-tools`（27 条，覆盖上面 1–3 条与 focus / menu / zoom / list_apps / batch / 设置撤销）、`computer-use-cursor`（3）、`settings-computer-use`（3）、`agent-tools-packaging` +1。
7. **UI**：`scripts/computer-use-tools-ui-test.mjs`（真实应用 + fixture core，窗口透明不占屏）新增第 3 步通过：System 页 Computer use 段列出 Finder，点 X 撤销后显示空态、下一次 app_list_windows 返回 `app_not_granted`；关开关后 `agentComputerUse: false` 落盘、下方行隐藏。假光标另用一个最小 Electron 进程实拍：显示正常、约 2.3 秒后消失。
8. **`app/public/build-info.json`**：没提交。但为了跑 UI 脚本执行过 `npm run build`，它被重写了（这是 build 的产物）；会话开始时那份未提交的内容无法精确还原。要 HEAD 版本可 `git checkout app/public/build-info.json`。

## 上一轮（七个工具）的验收记录

1. **发现测试**：通过。host 从工具目录发现恰好七个、组开关能整组关；七个 inputSchema 在 Ajv strict 下编译通过，合法 / 非法参数各自通过 / 拒绝（`tests/computer-use-agent-tools.test.mjs`，11 条）。
2. **列出 Finder 窗口（真机，DeepSeek Harness）**：通过。模型先调 app_list_windows 得到 `app_not_granted` + next_step，自己转去 request_access；允许后返回真实数据，主窗口 133 的位置尺寸 (124, 192) 920×436 与官方 computer-use 工具的基线一致。
3. **截 Finder 的图（真机）**：通过。1840×872 帧（920×436 的 2×），模型对 Downloads 列表的描述与图一致；transcript 里展开该行可见摘要与 1568×743 的图（经 CDP 读真实应用 DOM 确认）。
4. **未授权调 app_click**：通过，无界面。真实 host + 真实 native 模块，四种寻址都返回 `app_not_granted`，next_step 指向 request_access，不抛异常，native 零调用。
5. **授权卡只问一次**：通过，透明窗口不占屏幕。卡片按 bundle id 列 Finder（图标、文件系统风险、All），允许后同一会话再 request_access 不弹卡，app_list_windows 随即可用（`scripts/computer-use-tools-ui-test.mjs`）。
6. **npm test**：见本轮验收第 6 条（上一轮的结果占位没填，本轮全量重跑覆盖）。
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
