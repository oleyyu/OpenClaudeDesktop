# 交接：Computer Use 与官方 2.42304.0 全量工具面对齐（2026-10-21）

分支 `ui-next`。第一轮（开工于 `a0186be`）已提交为 `565b3f5` + `0336112`；**第二轮（HEAD `0336112` 之后）的改动全部未提交**
（工作区里的 M / ?? 文件，见 `git status`）。第二轮逐步记录在进度日志「第二轮」一节。
逐步过程、每步改了哪些文件与测试命令都在 `docs/computer-use-progress-20261021.md`；官方行为依据在
`docs/computer-use-official-spec-20261021.md`（本文用 "spec §x" 引用）；现有代码地图
`docs/computer-use-code-map-20261021.md` 写于第一轮开工前（行号仍是 `a0186be` 的），其中"占位 / 未注册 / Web 假光标"等描述已在第二轮最终回归时逐处标成现状。
`docs/computer-use-m4-plan-20261021.md` 没有写成（见进度日志「M4 原生方案」），M4 结论见本文第二节。

本轮原则（用户睡前指示）：一切照官方 2.42304.0 定，不停下来问；取舍与依据写进日志。官方没有对应物的 UI 不发明样式。

---

## 一、工具可用数总表

工具名单单一来源：`app/electron/computer-use/actions.mjs` `OWN_COMPUTER_USE_TOOLS`，**44 个，等于官方完整名单（spec §1.0）**，
`computer-use-agent-tools.test.mjs` 的发现测试断言两者相等。harness `APP_TOOL_NAMES` 只追加了名字。

汇总：**44 / 44 已注册；40 个返回真实结果；4 个受限；0 个占位**（上一轮是 24 个注册、14 个真实结果、10 个占位）。

| 工具 | 状态 | 做法 / 原因 |
|---|---|---|
| `request_access` | 真实 | 只把尚未授予的 flag（clipboardRead / clipboardWrite / systemKeyCombos）放上卡；teach 中 → `teach_mode_conflict` |
| `list_granted_applications` | 真实 | 另带 `preferredMode` / `fullControlApproved`，coordinateMode 已批准全屏时为 `display` |
| `list_apps` | 真实 | 不需授权 |
| `app_list_windows` | 真实 | 只列 layer 0…8；`is_off_space` 用 SkyLight Space 成员关系；AX 列不出的窗口用窗口标记判断最小化 |
| `app_screenshot` / `app_ax_find` / `app_zoom` / `app_release` / `app_focus` / `app_menu` | 真实 | 与上一轮相同；回合结束照官方释放全部 app 锁。第二轮：focus / menu / list_apps 的 AX 调用并回 `computer_use.node`（`MenuBar.swift`），找到但按不了的菜单项报 `menu_press_failed` |
| `app_click` | 真实 | 照官方点击梯子重写：行角色 `set AXSelected=true`（读回）/ 双击 `AXOpen`；文本在行里选行；AXPress 上溯 → 可选中祖先 `(ascended)` → `canvas`。Dock 用应用元素代替窗口、单击即 AXPress。`no_press_action` 不再产生 |
| `app_type` | 真实 | 不变（官方 app_type 没有剪贴板路径，未加） |
| `app_key` | 真实 | AX 档：return / escape / backspace(delete) / cmd+a；原始档：官方后台键集合经 `CGEventPostToPid` 发给窗口内键盘焦点，结果标 unverified；字母与 ⌘ 快捷键 `key_not_mapped`（引导 app_menu / app_type） |
| `app_scroll` | 真实 | 纯 AX：上溯找竖直滚动条，`AXValue += dy × 0.05`，截断 [0,1]，读回；只支持 dy（非 0 的 dx → `horizontal_scroll`） |
| `app_drag` | 真实 | 原始事件路径（不变）；系统应用读回不变一律 `drag_ineffective`（删了 `system_app_ignores_posted_events`） |
| `app_bring_to_current_space` | **受限** | 最小化 / 隐藏 → 原生"放到前台窗口之后"（`AXMinimized=false` / `unhide` + 对用户窗口 `AXRaise`）真实可用；**跨 Space 移窗不可用**：SkyLight 桥接操作对别的进程的窗口被 WindowServer 接受但静默忽略（实测），照官方返回 `op_unavailable`（feature_unavailable）+ `windowServerIgnored:true` |
| `app_batch` | 真实 | key / scroll 步走真实实现；scroll 的 ineffective 照官方不停批 |
| `request_full_control` / `release_full_control` | 真实 | request 只记批准（官方 `Ln()`），锁在下一次 display-scope 动作时拿；release 放锁 + 撤销批准 |
| `read_clipboard` / `write_clipboard` | 真实 | 要 flag + 全屏接管；持 app 锁 → `state_conflict`；click 层应用在前 → write 拒绝（clipboardGuard） |
| `request_teach_access` / `teach_step` / `teach_batch` | 真实 | 官方 teach 卡、提示层页面（逐字照搬）、主窗口隐藏 / 恢复、Next / Exit |
| `zoom` `left_click` `double_click` `triple_click` `right_click` `middle_click` `left_click_drag` `mouse_move` `cursor_position` `left_mouse_down` `left_mouse_up` | 真实 | 全局 HID 事件（真光标），事件源 `.privateState`；官方闸门顺序：接管 → 前台层级 V() → 命中测试 U() → 投递。第二轮：未按住的 mouse_move 照官方 `mouse_position` 放行；batch / teach 步骤内开输入突发（`beginInputBurst`，本应用窗口点击穿透）；`hideBeforeAction` 与存储面板守卫（`save_panel_restricted`）在投递前 |
| `key` `hold_key` `open_application` `switch_display` `wait` `computer_batch` | 真实 | 键盘同上；Escape 照官方逐次短暂注销急停快捷键；batch 遇错即停、统一拒绝形状 |
| `screenshot` / `scroll` / `type` | **受限** | 与 preview.mjs 同名（同一个 `code_desktop` 服务器）。host 按会话挑：**会话有已授权应用**时 tools/list 给 computer use 版，否则给 preview 版；调用按该连接最后一次 tools/list 派发并按参数纠偏。不重读 tools/list 的 core（Codex）若在授权前已列过工具，本会话用不到这三个全屏版；授权会话重读列表后用不到 preview 的这三个 |

拒绝形状统一为 `{ok:false, outcome, reasonCode, errorKind?, message, next_step}` + `isError`（`failure()` 也已统一），分类沿用
`reason-policy.cjs`，本轮新增的原因码都登记在 BLOCK / FALLBACK 里。`message` 用官方英文措辞的地方都注明了出处，工具描述全部自己写。

---

## 二、M4 两个实验的结论与证据

| 实验 | 结论 | 证据 |
|---|---|---|
| 一：认证事件让 Finder / Dock 接受后台点击 | **不做**。认证信封投递（`SLEventSetAuthenticationMessage` / `SLPostEventRecordTo`）被安全分类器拦截，未实现、未实机尝试；按补充规则不换说法重试 | 基线实测（进度日志「M4 实验一」）：现有 `CGEventPostToPid`（含字段 51/91/92）投递 5 次，Finder 列表行 **5/5 `selection_unchanged`**，前台与 z 序不变；另 5 次被当时的用户输入闸门挡下 |
| 一的替代：照官方走 AX | **已实现**。反汇编官方 `computer_use.node` 点击梯子（`0xbbc8`）：官方对行角色根本不发事件，而是 `set AXSelected=true` / `AXOpen`；Dock 项是 AXPress；桌面与 Spotlight 只在 display-scope | spec §1.2.1 / §1.2.2；`ClickLadderTests` 3 项；实机见第七节（锁屏受阻） |
| 二：key window 伪造让后台窗口收键 | **不做**。`SLPSSetFrontProcessWithOptions` 同样被拦截；上一个实现者留下的 `KeyWindow.swift` 与探针已删除 | 官方 app_key 不靠它：AX 动作 + 发给 pid 的原始按键（落到窗口内键盘焦点、结果 unverified） |
| 二的替代：照官方 app_key | **已实现并实机通过**：TextEdit 后台文档 cmd+a / right / backspace / return / left / shift+left / tab / forward_delete / cmd+left 全部读回正确；fixture 上 AX 忽略写入时退到原始按键 | 进度日志「app_key」实机记录；`KeyInputTests`、`computer-use-key-live.test.mjs` |

另外两条与 M4 相关的实测：

- **自己的事件不刷新用户空闲计时**：`postToPid` 的按键不刷新 `combinedSessionState`；全局 HID 事件用 `.privateState` 源时
  `hidSystemState` / `combinedSessionState` 都不变（`.hidSystemState` 源会清零）。所以 `user_actively_typing` 闸门不需要排除自己的事件；
  probe 新增 `secondsSinceOwnInput` 用于区分。
- **跨进程移 Space**：探针进程自己的窗口能在 Space 间移动（桥接操作与旧调用都行），别的进程的窗口两种方式都被静默忽略 → `op_unavailable`。
  官方 `app-cu-helper` 的 `hostPid` 参数用途未查明。

---

## 三、display-scope 与 full control 的设计

- **锁管理器** `electron/computer-use/full-control.cjs`：偏好模式（Background 默认 / Full control，存 `config.computerUsePreferredMode`，
  `app.whenReady` 里读完 preferences.json 后 `restore()`）；会话级批准集（回合结束不清）；单持有者显示锁。
  `releaseTurn`（回合结束只放锁）、`releaseAll`、`emergencyStop`（Esc：先停锁持有者，再停持 app 锁的会话，最后放锁）。
- **流程（照官方 §1.4）**：`request_full_control` 只记批准（偏好 Full control 免卡）；下一次 display-scope 动作 `acquireDisplayLock`；
  未批准时动作自己弹接管卡（通用文案），卡不可用 → `takeover_unavailable`，拒绝 → `takeover_declined`。
  互斥：本会话持 app 锁时 display-scope 与剪贴板 → `state_conflict`（先 `app_release`）；别的会话持显示锁 → app_* 与 display-scope 都 `cu_lock_held`。
- **闸门顺序**：`displayPrecheck`（allowlist_empty → cu_lock_held → state_conflict）→ 接管 → `frontmostTierGate`（官方 V()：无 bundle、本应用在前、未授权、层级不够）
  → `hitTest`（官方 U()：忽略本应用 overlay 与幻影光标面板；菜单栏层 24/25 跟前台；桌面空处要 Finder 授权）→ 修饰键时复查前台 → `executor.deliver`
  （`user_actively_typing` 3×200 ms 退避，每次重试前看 signal 与显示锁，停了就 `aborted` 不再调原生；原生键盘中止按 `opId`）。
- **坐标**：官方 R()——最近一次全屏截图 scale 1 的图像像素（本机 1372×892），换算到显示器逻辑点；没截图时 `x / scaleFactor`；
  zoom 区域夹到显示器内（修了 1 ulp 贴边被拒）。多显示器：`switch_display`（官方标签规则）、截图附显示器说明。
- **原生公共层** `DisplayInput.swift` / `DisplayKeys.swift`：显示器列表、区域截图（SCK `sourceRect`）、前台 / 命中窗口、全局移动 / 点击 / 按住 / 拖拽 / 滚动 / 按键 / 输入；
  全局事件只在 `DisplayInput.swift` 构造（raw-input 测试的"每个作用域一个构造点"不变量）。
- **同名工具**：见总表 `screenshot` / `scroll` / `type` 一行；`agent-tools-host.cjs` 的 `sharesName` + `prefersSharedTool`，未改 harness 共享逻辑。
- **UI**：接管卡复用审批卡壳 + 官方标题三变体，按钮 "Deny"（Esc）+ "Allow for this session"（⌘↵）（官方只有 suppressAlwaysAllowRule 时才是 "Stay in background"）；
  设置页 Computer use 加官方偏好行（单行、官方整句描述、分段控件在 control 槽）；持锁时整屏光晕 + 停靠条 + 系统通知 + 全局 Esc。
- **第二轮已做**：`hideBeforeAction`（截图 / 动作前隐藏非允许名单应用，回合结束 / 停止恢复，设置页 "Unhide apps when Claude finishes"）、`savePanelProbe`（`save_panel_restricted` 存储面板守卫，`save-panel.cjs` + 原生 `SavePanel.swift`），见进度日志「第二轮 · hideBeforeAction 与 savePanelProbe」；实机受阻。
- **第二轮已做**：官方主窗口右上角停靠（cu-side-panel，`side-panel.cjs`，拿显示锁停靠、放锁还原；渲染层停靠时按窄屏布局），见进度日志「第二轮 · full control 主窗口停靠」。
- **未做**：`pixelValidation`（官方默认关）、
  `save_to_disk`（无附件通路）、无人值守模式文案。

---

## 四、剪贴板

- `clipboard.cjs`：`paste()` = 官方 DPr（读旧文本 → 写入并回读 → ⌘V → 100 ms → finally 写回旧文本，只保存纯文本）；
  `guard()` = 官方 clipboardGuard（click 层应用在前时暂存并清空剪贴板，换走后写回，回合结束恢复）。子门默认 `clipboardPasteMultiline` / `clipboardGuard` 开。
- `type` 快速路径照官方 macOS 规则：**文本含换行** + `clipboardWrite` + 子门开，**无长度阈值**。粘贴前复查前台（变了 → `delivery_focus_check_failed`，不碰剪贴板），
  secure input 时不走剪贴板。只在"确定没投递"时回退逐字输入；⌘V 已投递、前台变了、中止都不回退（防重复 / 打错地方）。这条回退官方没有，是任务要求。
- 步骤行文案照官方 shared-130 / c52b02f3f（Reading / Copying to clipboard …）。

## 五、teach

- `teach-page.cjs`（官方 `rFa()` 整页逐字照搬，测试对参考包比对）、`teach-preload.cjs`（`CuTeach` 桥）、`teach.cjs`（提示层窗口参数照 `hFa`，
  会话管理照官方：显示步骤时隐藏主窗口、Next / Exit、非 teach 动作淡出、回合结束收起）。
- teach 卡照官方 `Ua` / `Hi` / `Wi`：GraduationCap、"Let {name} guide you step by step?"、应用列表 + 层级徽章、Deny / Start guide。
- 入口照官方不加（官方 teach 没有 UI 入口；Customize › Skills 等处的是 watch-record「Record a skill」，第二轮已做，见进度日志「watch-record」）。设置页 Teach mode 行改为反映真实权限状态。
- 不在 teach 模式时调 teach_step 返回 `teach_mode_not_active`（官方另一条现成文案），而不是会误导的 `{exited:true}`。

## 六、假光标与高亮

- **幻影光标**改为原生 `PhantomCursor.swift`（官方 §2.6.2）：每个 windowId 一个 56×56 NSPanel，`collectionBehavior 0x150`，官方箭头点列与两层样式，
  `order(.above, relativeTo: windowId)`、取目标 layer，目标不在屏就收起；pulse 只在 app_click。主线程不可用（`ELECTRON_RUN_AS_NODE`）→ 2 s 内返回
  `main_thread_unavailable`，`cursor.cjs` 回退到原来的 Web 近似。拿锁居中、每个 app_* 动作前隐藏目标窗口的光标、动作后移到落点、放锁隐藏。
  display-scope 照官方不用幻影光标（动的是真光标），面板编号进命中测试忽略列表。
- **整屏光晕**只跟显示锁持有者（官方 §2.5.2）。后台 app_* 步骤不再亮整屏光晕，只有停靠条（用户此前选的 in-use 触发）。
- **目标窗口高亮**：做过原生版（`WindowHighlight.swift` + `window-highlight.cjs`，官方 `#glow` 三层 inset 阴影 + 幻影光标的排序方式），
  最终审查时因**官方没有对应物**而**去接线**——文件与单测保留，`main.cjs` 不再创建。要启用需要用户决定。

---

## 七、实机验收记录

本轮绝大部分时间屏幕锁定、显示器休眠（用户睡觉），之后又一段时间用户在用电脑。下表如实记录，没有伪造通过。

| 项 | 结果 | 说明 |
|---|---|---|
| app_key：TextEdit 后台唯一命名文档 + fixture | **通过** | 前台与光标前后不变 |
| type-live acceptance 1b（app_key 用法改后） | **通过** | 1a 因 TextEdit 在运行照旧跳过 |
| M4 实验一基线（postToPid 点 Finder 行） | **失败（预期内的证据）** | 5/5 投递无效 |
| Finder 选行 ×10、文件夹双击 AXOpen、Dock AXPress | **受阻（锁屏）** | `computer-use-system-click-live.test.mjs` |
| app_scroll：fixture / TextEdit / Finder | **受阻（锁屏）** | `computer-use-scroll-live.test.mjs` |
| app_bring_to_current_space：最小化拉回 / TextEdit / 跨 Space | **受阻（锁屏 + 全屏 Space）** | 锁屏下只读验证了 dryRun 码、off-space / 最小化判定；跨进程移 Space 的"被忽略"是探针实测 |
| display-scope 指针：锁屏闸门 | **通过** | 截图 / zoom / cursor_position 正常；投递类都在闸门拒绝，光标不变 |
| display-scope 指针：fixture 交互（hover / 右键菜单 / 拖拽 / 多击 / 修饰键 / 按住） | **受阻** | 先是锁屏；解锁后一次运行时前台是用户的 VS Code、用户正在操作（空闲计时 0–6 s 反复归零，`secondsSinceOwnInput:null`），用例失败于前台闸门后停止 |
| display-scope 键盘：锁屏闸门 | **通过** | 原生在第一次按键前拒绝 |
| display-scope 键盘：fixture 交互 | **受阻** | 同上 |
| 原生按操作中止（opId） | **通过** | 不投递任何事件 |
| 剪贴板：锁屏闸门 + 真实剪贴板往返（875 字素，哈希还原） | **通过** | |
| 剪贴板：TextEdit 粘贴与速度对比 | **受阻（锁屏）** | 只有估计值（逐字 ≥7 s vs 粘贴 0.1–0.3 s），无实测数 |
| teach：两步 teach_batch、Exit、回合结束恢复主窗口 | **通过（部分）** | 显示器休眠，步骤动作只用 cursor_position / wait；锚点箭头与最终截图未测 |
| 幻影光标：原生面板参数、全屏 Space、负坐标、不在屏收起、cursor.cjs 原生模式 | **通过（部分）** | 副屏、截图像素、经工具链的 lock / click / release 受阻 |
| 窗口高亮：对齐 / 跟随 / 最小化 / 换 Space / 命中测试 | **通过（部分）** | 功能已去接线；截图像素、AX 命中到窗口内元素未测 |
| 官方 UI：接管卡、设置偏好行、teach 卡 | **通过** | `scripts/computer-use-tools-ui-test.mjs` passed:true（透明窗口） |
| 最终阶段：display-scope 指针 + 键盘 fixture 用例（解锁、显示器亮） | **受阻（有人在操作电脑）** | 见下 |

**最终阶段实机（2026-10-21 00:37–00:39）**：全量测试跑完后 probe 显示解锁、显示器亮、空闲已到 438 s，于是跑了
`CU_LIVE=1 ELECTRON_RUN_AS_NODE=1 node --test --test-concurrency=1 tests/computer-use-display-pointer-live.test.mjs tests/computer-use-display-keys-live.test.mjs`：
两个 fixture 用例都失败在第一步"fixture 到前台"（前台变成 `com.microsoft.Word`），没有进入任何点击 / 输入。随后**不运行任何东西**观察 30 s：
空闲计时反复归零（HIDIdleTime 0.17 s）、真实光标在 (543,367)→(1234,820)→(1352,113)→(1384,452) 间移动、当前 Space 41→33→198 来回切换、
前台始终是 Word——这期间我们没有任何进程在投递事件（`secondsSinceOwnInput:null`，fixture 已退出），所以**是用户本人或机器上的其他自动化
（进程表里有 Codex Computer Use 服务）在操作，不是我们自己的事件刷新了空闲计时**。按约束停止实机，不重试、不伪造通过；
因为有人正在用光标，也没有再把光标 / 前台改回测试前的 VS Code。全量测试期间（00:27–00:31）也观察到同样的空闲归零，测试本身全部用假原生、不投递事件。

所有实机步骤结束都恢复了前台、光标、Space；没有退出用户应用、没有用 osascript quit、没有解锁或改安全设置。

### 第二轮实机结果（HEAD `0336112` 之后）

第二轮每一步开工 / 收尾都用 `ioreg -c IOHIDSystem` 的 HIDIdleTime、`ioreg -n Root -d1 -a` 的 `CGSSessionScreenIsLocked`、`lsappinfo front`
检查；条件（未锁屏、空闲 ≥ 120 s、前台不是 loginwindow、非全屏 Space）一次都没有满足：要么锁屏，要么有人在用电脑（空闲 0–38 s 反复归零，
前台在微信 / Chrome / Telegram 间切换）。**第二轮没有任何交互型实机用例运行过，没有伪造通过**；只做了不碰屏幕与输入的原生只读冒烟。

| 项 | 结果 | 说明 |
|---|---|---|
| display-scope：mouse_move 对未授权前台放行、左键仍拒 | **受阻（有人在用）** | 新增 live 用例在 `computer-use-display-pointer-live.test.mjs` |
| hideBeforeAction 隐藏 / 恢复、TextEdit 存储面板守卫（含 app_key escape → AXCancel 取消面板） | **受阻（有人在用）** | 原生只读冒烟通过（`savePanelProbe {}` 返回完整字段、前台无 sheet；`previewHideSet` 只读列出待隐藏应用）；`SavePanel.swift` 的 AX 遍历规则未经实机核对 |
| full control 主窗口停靠（cu-side-panel）透明窗口验证 | **受阻（有人在用）** | `scripts/computer-use-tools-ui-test.mjs` 第 5 节会启动 Electron 窗口，有人在用时不跑 |
| watch-record 5 秒示范 | **受阻（有人在用）** | live 用例实际运行结果为 skip（idle 0.1 s < 120 s）；只读冒烟：`watchRecordDrain` 空、probe `axTrusted/screenCapture` true、node 进程里 `voiceoverAvailability` = `no_microphone_usage_description`（打包后由 extend-info 提供） |
| watch-record 语音旁白（SFSpeechRecognizer） | **未跑** | 需要打包后的应用 + 麦克风与语音识别授权 |
| cu-ax 并回 native：只读 AX 对拍（probe / menuList / apps） | **通过** | 与旧 helper 的只读结果逐项一致（锁屏下只读查询，不发输入） |
| cu-ax 并回 native：菜单 press / close、app_focus 交互 | **受阻（锁屏）** | `scripts/computer-use-ax-tools-check.mjs` 未跑 |
| 补跑第一轮全部受阻项（本节上表） | **受阻** | 18:57–19:03 锁屏，19:03 起用户解锁并持续操作，19:08 按约束停止，未运行任何用例（进度日志「第二轮 · 实机」） |
| 最终回归（19:24） | **受阻（锁屏）** | 前台 `com.apple.loginwindow`、`CGSSessionScreenIsLocked = true`、空闲 405 s；未运行任何实机用例 |

**第二轮新增的补跑命令**（条件同上；均在 `app/` 下）：

```sh
CU_LIVE=1 node --test --test-concurrency=1 tests/computer-use-hide-live.test.mjs tests/computer-use-save-panel-live.test.mjs
CU_LIVE=1 node --test --test-concurrency=1 tests/computer-use-watch-record-live.test.mjs
CU_LIVE=1 node --test --test-concurrency=1 tests/computer-use-key-live.test.mjs
ELECTRON_RUN_AS_NODE=1 node_modules/electron/dist/Electron.app/Contents/MacOS/Electron scripts/computer-use-ax-tools-check.mjs
npm run build && node scripts/computer-use-tools-ui-test.mjs   # 第 5 节：停靠透明窗口
```

**解锁、用户不在电脑前、在桌面 Space 时补跑**（每条都会自己恢复前台与光标）：

```sh
cd app
CU_LIVE=1 CU_LIVE_DOCK=1 node --test --test-concurrency=1 tests/computer-use-system-click-live.test.mjs
CU_LIVE=1 node --test --test-concurrency=1 tests/computer-use-scroll-live.test.mjs tests/computer-use-bring-space-live.test.mjs
CU_LIVE=1 ELECTRON_RUN_AS_NODE=1 node --test --test-concurrency=1 tests/computer-use-display-pointer-live.test.mjs tests/computer-use-display-keys-live.test.mjs
CU_LIVE=1 ELECTRON_RUN_AS_NODE=1 node --test --test-concurrency=1 tests/computer-use-clipboard-live.test.mjs
CU_LIVE=1 node scripts/computer-use-teach-live.mjs
CU_LIVE=1 node scripts/computer-use-cursor-live.mjs
```

---

## 八、已知限制

1. 跨进程移 Space 不可用（`op_unavailable`）；全屏应用的 Space 照官方 `fullscreen_space` 拒绝。
2. 同名工具 `screenshot` / `scroll` / `type` 的取舍（总表）；transcript 里无参数 screenshot 与任何 `type` 按 preview 算（不显示为 CU 步骤行，光晕 / 停靠条由显示锁驱动不受影响）。
3. app_key 后台原始按键只有官方键集合，结果 unverified；后台应用无菜单栏时 cmd+a → `menu_command_disabled`。
4. app_scroll 只竖直、每单位约 5%；overlay 滚动条下 AX 是否暴露 `AXVerticalScrollBar` 未实机确认；网页（AXWebArea）滚动未覆盖。
5. app_drag 在系统应用上只是"投递了"，读回不变即 `drag_ineffective`。
6. ~~`mouse_move` 对未授权前台应用保守拒绝~~ **第二轮已照官方改**：未按住的 mouse_move 走 `mouse_position`，任何前台都放行、不做命中测试；按住时前台 `mouse`、目标 `mouse_full`；scroll / left_mouse_up 的闸门种类与"拒绝也松开"同步照官方（进度日志「第二轮」）。
7. 回合结束释放 app 锁（官方），下一回合的 app_* 需要重新 app_screenshot。
8. 接管卡无法显示时拒绝（`takeover_unavailable`），而官方在没有卡片处理器时直接批准：本 build 的 "unavailable" 是卡片失败，不在用户不知情时给全屏控制。
9. 修饰键只设在鼠标事件 flags 上，不另发 flagsChanged；`open_application` 后台启动时用 listWindows 轮询第一个窗口。
10. ~~代码地图里关于占位工具、no_press_action、Web 假光标、"display-scope 未注册"的描述已过时~~ **第二轮最终回归已在代码地图里逐处标成现状**；20261020 交接是历史文档，未改。
11. ~~`helpers/cu-ax` 仍是独立进程（每次 20–30 ms），未并回 native；`helpers/cu-ax` 的 app_menu 仍可能返回 `no_press_action`。~~ **第二轮已并回**：probe / focus / menu / menuList / menuClose / apps 在 `computer_use.node`（`MenuBar.swift`：`AXQuery` / `AppFocus` / `MenuBar` / `AppList`；Bridge `axProbe` / `focusWindow` / `menu {mode}` / `listApps`），`ax-helper.cjs` 只做路由；找到但按不了的菜单项照官方报 `menu_press_failed`（unsupported + axError）；`helpers/cu-ax` 及其构建 / 打包 / 签名引用已删（进度日志「第二轮 · cu-ax 并回 native」）。

12. （第二轮）`SavePanel.swift` 的 AX 遍历规则（文件夹弹出、所示文件夹推断、Move To 表、弹出框位置）按官方字段名与 AppKit 结构自写，未经实机核对；官方 `autoTargetDisplay` 的 `resolvePrepareCapture` 未做（仍是先 prepareForAction 再截图）；原生 `prepareDisplay` 的"激活允许应用"细节未逐条核对。
13. （第二轮）输入突发：官方在 50 ms 之外还轮询 `windowNumberAtPoint` 直到本应用窗口离开该点，原生没有这个调用，照官方回退只等 50 ms；`refusalFor(windowNumber)`（点落在本应用原生窗口）本 build 无对应窗口，未做。
14. （第二轮）cu-side-panel：停靠条显示条件仍是 in-use（用户此前选的），不是官方的 `dock holder === 当前会话`；停靠中退出应用，下次启动按停靠尺寸打开（官方同样不还原）。
15. （第二轮）watch-record 只有 skill 模式；context 模式（Share screen、录制芯片审阅 / 裁剪 / 转写）、"events" 输出模式、远程桌面检测、`propose_skills` 工具未做；官方气泡的图片轮播用现有单图查看器代替。
16. （第二轮）app_menu 官方的 `foreign_pid` / `system_menu` / `services_menu` / `share_menu` / `clipboard_menu_item` / `menu_bar` / `transientHoldRefusal` 原生判定未做（并回 native 一步只做了搬迁 + `menu_press_failed`）。

## 九、照官方做出的取舍（摘要，详见进度日志各步"取舍"）

- 全部照官方：app_scroll 不自动找主滚动区；type 剪贴板只看换行不看长度；request_full_control 只记批准；回合结束放锁不撤批准、并释放 app 锁；
  接管卡按钮 Deny / Allow for this session；teach 不加入口；display-scope 不用幻影光标；整屏光晕只跟显示锁。
- 偏离官方且有理由的：跨 Space 被忽略报 `op_unavailable` 而非超时 `state_conflict`（有确定性证据，避免反复重试）；到端滚动不写直接 ineffective + `atLimit`；
  teach 动作失败用统一拒绝形状 + isError（保留官方字段）；剪贴板粘贴失败回退逐字（任务要求）；Esc 守卫照官方真实行为（逐次短暂注销）而非审查建议的计数吸收（官方计数是死代码）。
- 第二轮（详见进度日志「第二轮」各步）：mouse_move 未按住时照官方 `mouse_position` 放行、不做命中测试；left_mouse_up 被拒时先松开再拒；
  输入突发只在 computer_batch / teach 步骤内开（官方 `Gi()` 三处调用点）；release_full_control 不取消隐藏（官方 `Bn()`），回合结束 / 停止才恢复，
  设置页只加官方的 "Unhide apps when Claude finishes"；存储面板探针出错时全屏工具拒绝、app_* 本次不判（官方 `gt()` / `Ut`），守卫不因异常永久关闭；
  停靠哪扇窗取"持锁会话的完整窗口 → 最近聚焦 → 第一扇"，停靠期间不换窗；watch-record 入口放在官方同一槽位（+ 菜单 Add folder 之后、Customize），
  交付走 Codex turn input（文本块 + localImage），watch-record 不产生模型工具拒绝、未新增 reasonCode；app_* 被存储面板拦下时四张 next_step 表共用同一条 `SAVE_PANEL_STEP`。
- 官方没有对应物、没做或做了不接线：目标窗口高亮（去接线）、Denied apps 黑名单（用户拒绝）。watch-record（skill 模式）与 cu-side-panel 停靠第二轮已做；watch-record 的 context 模式（Share screen）因本应用无麦克风菜单未做。

---

## 十、全量测试结果

**第二轮最终回归（2026-10-21 19:13–19:31）**：

| 命令 | 结果 |
|---|---|
| `cd app && npm run build:native` | 通过（只有 `computer_use.node`）；`app/public/build-info.json` 前后 shasum 都是 `a573ac5…`，未被改写 |
| `cd app/native/computer-use && swift test` | **59 / 59** 通过（第一轮 42，第二轮新增 HideAndSavePanel / MenuBar / WatchRecorder 等） |
| `cd app && npm test`（全量，636 s） | **5928 项：5879 通过、0 失败、49 跳过**。跳过：36 项 `CU_LIVE=1` 实机、6 项 analysis/batch-20260920 冻结基线不在、4 项 `CODEX_INTEGRATION=1`、1 项 `PREVIEW_ELECTRON=1`、1 项 worktree-prepare 已改走 mjs、1 项文件系统拒绝非法 UTF-8 文件名——均为条件跳过，与本轮无关 |
| `cd harness && npm test` | **718 项：717 通过、1 失败**；唯一失败是下面第 2 条既有的 `zcode-bridge`（期望 "Settings › Preferences › Account"，实际 "Settings › General › Account"），与第一轮、HEAD 相同，非本轮引入，未动 |

本轮没有因回归失败而改代码。

**第一轮最终回归**（留档）：

| 命令 | 结果 |
|---|---|
| `cd app && npm run build:native` | 通过（computer_use.node + cu-ax-helper）；`app/public/build-info.json` 未被改写 |
| `cd app/native/computer-use && swift test` | **42 / 42** 通过 |
| `cd app && npm test`（全量，645 s） | **5847 项：5802 通过、0 失败、45 跳过**（跳过的全是 `CU_LIVE=1` 实机用例与 `CODEX_INTEGRATION=1` 的真实 Codex 用例）。上一份交接里的既有失败 `view-tabs-manifest`「host code imports view-tab modules …」在当前测试集里已不存在（不是本轮删的） |
| `cd harness && npm test`（第一次） | 718 项：716 通过、2 失败 |
| `cd harness && npm test`（修复后） | **718 项：717 通过、1 失败** |

harness 两个失败的判定（与 HEAD 对比）：

1. `app-tool-names-sync`「APP_TOOL_NAMES lists every tool of app/electron/agent-tools」——**本轮引入，已修**。原因：computer use 的
   `screenshot` / `scroll` / `type` 与 preview 同名（`sharesName`），app 侧工具清单里这三个名字各出现两次，而测试拿未去重的数组和
   `APP_TOOL_NAMES` 比。同一个名字在服务器上仍是一个工具，所以测试改为先去重（与 app 侧 `tests/app-tool-names-sync.test.mjs` 用 Set 的口径一致），
   只改了测试，没有动 `APP_TOOL_NAMES` 或共享逻辑。
2. `zcode-bridge`「official MCP services: identity headers from the browser sign-in, only for the ZCode API origin」——**既有失败**：用 `git archive HEAD harness`
   解出的 HEAD 副本里同样失败（20261020 交接也记过），与本轮无关，未动。

## 十一、仍未完成

1. **实机**：第七节两张表里所有"受阻 / 未跑"的项（第一轮的系统应用点击、app_scroll、bring-to-space、display-scope fixture 交互、TextEdit 剪贴板粘贴、teach / 光标 live 脚本；第二轮的 mouse_move 放行、hide / 存储面板守卫、停靠透明窗口、watch-record 5 秒示范与语音旁白、cu-ax 交互型检查、key-live），补跑命令见第七节。条件：未锁屏、空闲 ≥ 120 s、桌面 Space。
2. 官方 `autoTargetDisplay` 的 `resolvePrepareCapture`；`SavePanel.swift` AX 规则的实机核对（第八节 12）。
3. watch-record 的 context 模式 / events 模式 / `propose_skills`（第八节 15）。
4. app_menu 官方的其余原生拒绝判定（第八节 16）。
5. 目标窗口高亮是否启用（已去接线，官方无对应物）；Finder 行是否提供 `AXOpen`、图标视图项角色、overlay 滚动条的 AX 行为待实机确认。
6. `npm run package` 未实际跑（`extend-info.plist` 的 `NSSpeechRecognitionUsageDescription`、删 cu-ax 后的 unpack / 签名只有单测覆盖）。
7. 第二轮全部改动未提交。
