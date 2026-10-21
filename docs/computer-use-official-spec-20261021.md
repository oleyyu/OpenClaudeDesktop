# Computer Use 官方规格（Claude Desktop 2.42304.0）

参考包固定为 `reference/installed-2.42304.0-20261017`。本文只读源码，不运行官方代码。

**引用约定**

- `BEf0UhNC:L123`：`asar/.vite/build/index.chunk-BEf0UhNC.js`（computer-use MCP 服务端：工具定义、闸门、处理函数）
  用 `tools/node_modules/.bin/prettier --parser babel --print-width 120` 格式化后的行号（格式化副本不入库，按此命令可复现）。
- `BZtMzTi2:L123`：同样格式化后的 `index.chunk-BZtMzTi2.js`（远程设备桥 `[remote-cu]`，授权记录与接管位）。
- `muI2IV6k@N`、`B5tintml@N`、`CB6cNSrW@N`：主进程压缩 chunk 的字节偏移（文件只有十几行，不格式化）。
- `ca31fdde5@N`、`c71860c77@N`：`ion-dist/assets/v1/` 下渲染层 chunk 的字节偏移。
- 函数名都是压缩后的符号，只在本版本有效。

`work/claude-cli-*`（`claude-cli-dynamic-analysis-20261005/bundle.js` 91KB、`claude-cli-workflow-merge-20261005/PLAN.md`）
里搜不到 `computer_batch` / `left_click` / `request_access` / `clipboardWrite` / `chicago`：**CLI 侧 computer-use 规格未找到**，
下文全部来自 Desktop 包。

---

## 一、工具面

### 1.0 工具清单与注册条件

工具由 `Ne(caps, coordinateMode, installedApps)`（`BEf0UhNC:L439–807`）一次生成；app 级工具在 `Pe(supportsRawInput, platform)`
（`L809–1188`），teach 工具在 `Fe(...)`（`L1189–1256`）。本机 Desktop（CCD/Cowork）的调用方是 `kr()`（`B5tintml@45755`）：

```
Ne({...Tk, teachMode: pk(), adaptiveResolution: fk().adaptiveResolution,
    appScoped: sk() ? { supportsRawInput: true } : undefined }, lk(), installedApps)
```

所以在 macOS Desktop 上 `appScoped.supportsRawInput === true`，`je(platform, t)`（`L435`）为真：app_drag、app_bring_to_current_space
会注册，app_key 用"原始按键"版描述，app_batch 的 action 枚举含 `drag`。

| 组 | 工具（按 `Ne` 返回顺序） | 条件 |
|---|---|---|
| 授权 | `request_access` | 总是 |
| display-scope（无前缀，接管全屏） | `screenshot` `zoom` `left_click` `double_click` `triple_click` `right_click` `middle_click` `type` `key` `scroll` `left_click_drag` `mouse_move` `open_application` `switch_display` `list_granted_applications` | 总是 |
| 列应用 | `list_apps` | `appScoped && platform==="darwin"`（`L706`） |
| 剪贴板 / 杂项 | `read_clipboard` `write_clipboard` `wait` `cursor_position` `hold_key` `left_mouse_down` `left_mouse_up` `computer_batch` | 总是 |
| teach | `request_teach_access` `teach_step` `teach_batch` | `caps.teachMode`（`L805`） |
| 模式开关 | `release_full_control` `request_full_control` | `appScoped`（在 `Pe` 里，`L858–870`） |
| app_*（后台单窗口） | `app_list_windows` `app_ax_find` `app_screenshot` `app_zoom` `app_click` `app_type` `app_key` `app_scroll` `app_focus` `app_drag`* `app_menu` `app_batch` `app_release` `app_bring_to_current_space`* | `appScoped`；带 * 的另需 `supportsRawInput`（`L1038`、`L1167`） |

注册后的再加工（`Ir()`，`B5tintml@≈45900`）：

- 门 `t.ck()` 打开时（"只有 batch"模式），把 `Me`（= `computer_batch` 的 action 枚举，`L438`）里的单步交互工具从清单删掉，
  并在 `computer_batch` 描述末尾追加 `Er`（`B5tintml@45430`，意思：本会话没有单步交互工具，单步也用一项的 batch）。
- `qe(...)` 为真时给每个工具加 `alwaysLoad: true`。
- `toolsIncludeAppScoped = 清单里有 request_full_control`，决定 `getPreferredMode` / `getTakeoverConsentMode` 是否生效（见 1.4.1）。

服务端前置检查（每次调用，`BEf0UhNC:L5540–5576` `ta()`）：功能禁用 → `bn()`；系统权限（辅助功能 + 屏幕录制）未齐时只允许
`request_access` / `request_teach_access`；授权为空且不是 `Mr()` 名单（`request_access` `request_teach_access`
`list_granted_applications` `list_apps` `app_release` `request_full_control` `release_full_control`，`L5952–5962`）→ `allowlist_empty`。

错误统一形状 `M(text, error_kind, error_detail?)` = `{content:[{type:"text",text}], isError:true, telemetry:{error_kind,error_detail}}`
（`L1286–1292`）；成功 `N(text)` 纯文本，`P(obj)` = JSON 文本（`L1293–1298`）。

---

### 1.1 display-scope 工具（无前缀）

#### 共用片段

- **坐标** `f`（`L470`）：`array<number>`，`minItems/maxItems 2`，描述取 `Ee[coordinateMode]`（`L363–372`）。
  `coordinateMode` 来自 GrowthBook `chicago_config.coordinateMode`，默认 `"pixels"`（`Olr`，`muI2IV6k@3685304`），可选 `"normalized_0_100"`。
  - pixels：最近一次截图图像的像素（服务端负责缩放）。
  - normalized_0_100：屏宽/屏高的百分比 0–100。
- **修饰键** `p`（`L471–475`）：`text: string`，点击期间按住的修饰键，语法同 `key`。
- **闸门句** `i`（`L440–443`）：macOS 上是"调用时最前面的应用必须在会话允许名单里，否则报错且不执行"；
  `hitTest==="none"`（Wayland 共享整屏）时换成共享屏幕版。
- **app_* 提示** `m`（`L476–479`）：`appScoped` 时追加到 `screenshot`，说明想不接管屏幕就用 app_*，但 app_* 到不了悬停态
  （`supportsRawInput` 时还说到不了右键菜单；否则还有画布拖拽）。
- **剪贴板附注** `h`（`L480–482`）：`appScoped` 时追加到 read/write_clipboard：算作全屏控制，需要同样的接管批准，
  持有 app 窗口时拒绝。
- **scale**（`adaptiveResolution !== false` 时才出现）：`number`，范围 `[0.1, 1]`（`Gsr`/`Ksr`，`muI2IV6k@3670754`）；
  描述 `qsr`：1 用满图像预算，0.5 半宽半高约四分之一 token；坐标始终是全分辨率坐标帧，不是缩放后图像的像素。
  缩放时结果追加 `Jsr(scale,w,h)` = `"<scale>-scale view; coordinate frame: WxH."`（`li()`，`L4709`）。
- **save_to_disk**（`caps.saveToDisk !== false` 时出现，`L447`）：`boolean`，把图存盘以便附给用户。

#### 逐个工具

| 工具 | inputSchema（required 加粗） | 语义 / 处理函数 |
|---|---|---|
| `screenshot` | `scale?` `save_to_disk?` | 截主显示器（实为当前选定显示器）。macOS `screenshotFiltering:"native"`：非允许名单应用在合成层被排除，只看得到已授权应用和桌面；`mask` 用色块遮挡；`none` 不过滤。返回的图像就是后续点击坐标的参照。`ui()` `L4713`：`autoTargetDisplay` 子门开时走 `resolvePrepareCapture`（自动挑显示器 + 截图前隐藏非授权应用），否则 `prepareForAction` + `screenshot`；图过小（< `gr(scale)` 字节）重试一次。结果：可选显示器说明（`ci()` `L4687`：多显示器时"截在哪台，其他还有哪些，可用 switch_display"）、被隐藏应用说明（`oi()`）、缩放说明、`image/jpeg` 图。 |
| `zoom` | **`region`** `[x0,y0,x1,y1]` 整数 4 项；`scale?` `save_to_disk?` | 对最近一次**全屏**截图的某块取高分辨率图，只读；之后点击坐标仍按全屏截图。`pi()` `L4810`：校验（非负、x1>x0、y1>y0、不超帧）→ 换算到显示器逻辑点 → `executor.zoom(rect, allowed, displayId, scale)`。没截图时报 `state_conflict` "take a screenshot before zooming"。 |
| `left_click` / `double_click` / `triple_click` / `right_click` / `middle_click` | **`coordinate`**、`text?`（修饰键） | `mi(…, button, count)` `L4837`：若鼠标被 `left_mouse_down` 按住先松开；修饰键含系统组合且无 `systemKeyCombos` → `grant_flag_required`；先 `moveMouse` 到目标再过前台闸门 `Bt(…,"mouse"|"mouse_full")`；左键无修饰为 `mouse`，其余（右/中键、带修饰）为 `mouse_full`；`pixelValidation` 子门（默认关）开时比较 9px 补丁，变了就返回提示不点；命中测试 `U()`；有修饰键时再查投递前前台没变；`executor.click(x,y,button,count,mods)` → `"Clicked."`。 |
| `type` | **`text`** | 往当前键盘焦点打字，支持换行；快捷键用 `key`。`hi()` `L4895`，剪贴板快速路径见 §1.5。普通路径：有 `typePaced` 就整串按 8ms 节奏打（`br=8`）→ `"Typed N char(s)."`；否则按字素逐个打，回车/Tab 走 `key`，控制字符逐个过闸门 → `"Typed N grapheme(s)."`。投递中前台换了 → `delivery_focus_check_failed`（`H()` `L1586`）。 |
| `key` | **`text`**（`"cmd+shift+a"` 形式）、`repeat?` 整数 1–100 | `gi()` `L4936`：系统级组合（退出应用、切应用、锁屏）需 `systemKeyCombos`，否则 `grant_flag_required`；过键盘闸门；`wA(chord,"key")` 校验；按 `repeat` 次，间隔 8ms，有存储面板探针时每次重查。→ `"Key pressed."` / `"Key pressed N times."`。 |
| `hold_key` | **`text`** **`duration`**（秒 0–100） | `Li()` `L5280`：按住组合 `duration` 秒再松开，可被中断；系统组合同样要 `systemKeyCombos`。→ `"Key held."`。 |
| `scroll` | **`coordinate`** **`scroll_direction`**（`up/down/left/right`）**`scroll_amount`**（整数 0–100，"格"） | `_i()` `L4973`：闸门 `mouse`；换算坐标；命中测试；`executor.scroll(x,y,dx,dy)`（左/上为负）。鼠标被按住时算拖拽（`mouse_full`）。→ `"Scrolled."`。 |
| `left_click_drag` | **`coordinate`**（终点）、`start_coordinate?`（缺省从当前光标） | `vi()` `L4997`：起点、终点分别命中测试（终点按 `mouse_full`）；`executor.drag(from, to)`：按下 → 50ms → 动画移动 → 松开。→ `"Dragged."`。 |
| `mouse_move` | **`coordinate`** | `yi()` `L5022`：用于触发悬停态；未按住时闸门是 `mouse_position`（任何层级都放行），按住时按拖拽检查。→ `"Moved."`。 |
| `left_mouse_down` | （无） | `Ri()` `L5306`：在当前光标处按下并保持；已按住 → `state_conflict`。模块级标志 `Q`（按住）/`$`（按住后移动过）。→ `"Mouse button pressed."`。 |
| `left_mouse_up` | （无） | `zi()` `L5318`：在当前光标处松开；没按住也安全。按住后移动过按拖拽检查，否则按点击检查。→ `"Mouse button released."`。 |
| `cursor_position` | （无） | `Mi()` `L5199`：有截图时返回截图像素坐标 `{x,y,coordinateSpace:"image_pixels"}`（缩放时附帧尺寸说明）；没截图或光标在别的显示器 → `logical_points`。macOS 还在光标位于某个 app_screenshot 过的窗口上时附 `appWindow`。后台模式下改走 `Ii()` `L5264`：返回自己最近一次 app_* 动作的落点 `{coordinateSpace:"app_screenshot_pixels", app, window_id, x, y, note}`。 |
| `open_application` | **`app`**（显示名或 bundle id） | 启动或确保运行；目标必须已授权。`xi()` `L5051`：持有 app 锁且 app 级可用时 `openApp(id,{activates:false})` 后台打开；否则 `openApp(id)` 拉到前台，多显示器时提示可能开在别的屏。后台偏好下的特殊分支见 §1.4.5。 |
| `switch_display` | **`display`**（截图说明里的显示器名，或 `"auto"`） | `Si()` `L5074`：`onDisplayPinned(id)` 钉住显示器；`auto` 恢复自动；只有一台 → `bad_args`；名字不存在 → 列出可用名。之后需要再截图。 |
| `list_granted_applications` | （无） | `Ci()` `L5097`：返回 `{allowedApps, grantFlags}`。（描述里说还有坐标模式，代码里**没有**返回。） |
| `list_apps` | `query?` `running_first?`（默认 true）`limit?`（1–200，默认 25）`cursor?` | `wi()` `L5100`：列已装与运行中的应用（去掉用户拒绝、策略禁止、本应用），运行中的在前带 pid；游标是 base64 偏移，返回 `nextCursor`。授权前可调。 |
| `read_clipboard` | （无） | 见 §1.5。 |
| `write_clipboard` | **`text`** | 见 §1.5。 |
| `wait` | **`duration`**（秒 0–100） | `ji()` `L5187`：每 50ms 检查一次中断。→ `"Waited Ns."`。 |
| `computer_batch` | **`actions`**（≥1 项，项 schema 见下）、`save_to_disk?` | `Zi()` `L5419`，见下。 |

**`computer_batch.actions[]` 项 schema** `De`（`L373–432`；`adaptiveResolution===false` 时去掉 `scale` 成 `Ae`）：

```
action*: enum [key, type, mouse_move, left_click, left_click_drag, right_click, middle_click,
               double_click, triple_click, scroll, hold_key, screenshot, zoom, cursor_position,
               left_mouse_down, left_mouse_up, wait]
coordinate: [x,y]          region: [x0,y0,x1,y1] 整数（按本 batch 之前的全屏截图）
scale: number              start_coordinate: [x,y]
text: string（type 的文字 / key、hold_key 的组合 / 点击、滚动时按住的修饰键）
scroll_direction: up|down|left|right    scroll_amount: 0–100
duration: 0–100 秒（hold_key、wait）    repeat: 1–100（key）
```

batch 语义（`Zi()` + `Ki()` `L5368` + `Gi()` `L5353`）：

- 先整体校验（`Xi()` `L5409`），不在枚举里的 action 直接 `bad_args`；`open_application` 等不能进 batch。
- 开始前做一次 `hideBeforeAction`；批内子动作关掉 `hideBeforeAction` / `pixelValidation` / `autoTargetDisplay`。
- 动作间延时：基础 10ms + `Bi` 表（点击类 150、`scroll`/`left_click_drag` 100、`left_mouse_down/up` 50），
  前一个是 `mouse_move` 再加 50（macOS；Windows 指针类统一 +50；Linux 或 `pointerActionsBackToBack` 一律 10）。
- 指针类动作连成一个"输入突发"（`executor.beginInputBurst`）。
- 每个动作前都重跑前台闸门；遇错即停，松开按住的鼠标，结果是 `"[i/N] action: FAILED — …"` 逐行加
  `"Batch stopped at actions[i] (x). k completed, m remaining."`，出错后的图像省略为 `[Image omitted due to error]`。
- 成功时每项 `"[i/N] action: <文本或 ok>"`，截图/缩放图穿插返回；批里最后一张全屏截图成为下一次调用的坐标参照。
- 只有 `wait` / `switch_display` 的 batch 视为只读（`Ar()` `L5929`），不触发接管。

#### 坐标空间（屏幕坐标）

`R(x, y, mode, display, lastShot)`（`L1372–1411`）：

- pixels 且有截图：`X = round(x · displayWidth / frameW) + originX`，`Y` 同理，其中 `frameW = lastShot.frameWidth ?? width`
  （缩放截图时坐标仍按全分辨率帧）；结果夹到显示器范围内（`rt()`）。超出帧 → `bad_args`，让重新截图。
- normalized_0_100：`X = round(x/100 · display.width) + originX`。
- 没截图：用 `x / scaleFactor` 兜底并记日志警告；超出显示器 → 报错让先截图。
- 得到的是**全局逻辑点**（多显示器下带该显示器 origin），直接交给 `executor.moveMouse/click`。
- `zoom` 的 region 按 `displayWidth/frameW` 换算成逻辑矩形；`cursor_position` 反向换算。
- 命中测试前先查点是否落在任何显示器内（`ft()` `L1595`），否则 `hit_test_off_display`。

---

### 1.2 app_* 工具（后台单窗口）

共用片段（`Pe()` `L809–857`）：

- `app` `i`：目标应用 bundle id，必须已授权。
- `window_id` `a`：`number`，CGWindowID（来自 app_list_windows 或上次 app_screenshot）；缺省用该应用最近一次 app_screenshot 的窗口，
  没截过就用主窗口。没有单独的切窗口工具，按调用传。
- `coordinate` `o`：最近一次 app_screenshot 全分辨率帧里的像素，(0,0) 为帧左上角；需先 app_screenshot；与 `element_index`、`target` 互斥。
- `region` `s`：`[x0,y0,x1,y1]`，同坐标空间。
- `element_index` `c`：app_screenshot 返回的 AX 摘要 `[N]`，打到该元素中心；跨内嵌页面或命中别的元素时拒绝。
- `target` `l`：`enum ["focused"]`，作用于应用当前焦点元素（Pages/Keynote 这类画布应用）。三者都不给时默认用本窗口上一次 app_* 动作的落点。
- `path` `u`：2–20 个点的拖拽路径。
- 描述尾 `d`：后台作用于单个应用，窗口不来前台；菜单栏用 app_menu；悬停（以及无原始输入时的右键菜单、画布拖拽）仍需 display-scope 工具。

逐个层级要求 `Yt`（`L2244–2258`）：`app_list_windows/app_screenshot/app_zoom/app_ax_find/app_batch/app_bring_to_current_space = read`，
`app_click/app_scroll = click`，`app_drag/app_type/app_key/app_menu/app_focus = full`。不够 → `tier_insufficient`（`Zt()` `L2260`）。

处理分派 `fr()`（`L3664–3782`）；需要窗口目标的都走 `Z()` → `ir()`（`L3269–3624`）：解析目标点 → 校验各种状态
（secure input、窗口可达、`un()` app 锁）→ `appScoped.dispatch(app, windowId, pt, intent, target, isAborted)`（有写互斥）
→ 记录 `lastWindowPt`、设置假光标 `setPhantomCursor(screenX, screenY, windowId, pulse=click)` → 按 outcome 组织文本。

| 工具 | inputSchema（required 加粗） | 要点 |
|---|---|---|
| `app_list_windows` | **`app`** | 返回 `[{window_id,title,is_main,is_minimized,is_hidden,is_off_space,bounds}]`，辅助窗口带 `is_auxiliary:true`。 |
| `app_ax_find` | **`app`**、`window_id?` `role?`（精确 AX role）`title_contains?` | 在上次 app_screenshot 捕获的 AX 元素里查，返回带 `[N]` 的匹配。 |
| `app_screenshot` | **`app`**、`window_id?` `scale?`（0.1–1） | 截单窗口（可见、最小化、随应用隐藏、在别的 Space 都行），附可交互元素摘要。 |
| `app_zoom` | **`app`** **`region`**、`window_id?` `scale?` | 已截窗口的局部高清图，无元素摘要，坐标仍按 app_screenshot。 |
| `app_click` | **`app`**、`window_id?` `coordinate?` `element_index?` `target?` `button?`（left/right）`count?`（1/2/3） | 右键：先校验目标再固定拒绝 `feature_unavailable`（会把应用拉到前台，建议 app_menu 或 app_release 后用 display-scope）。弹出菜单类控件拒绝；`unsupported(canvas)` 时改用 element_index/target。Chromium/Electron 原始输入可能带 Command 键，结果会说明。 |
| `app_type` | **`app`** **`text`**、`window_id?` `coordinate?` `element_index?` `target?` `overwrite_existing?` `mode?`（insert/replace）`disable_substitutions?` | 只对文本字段；整字段替换默认拒绝（`would_replace_content`），`overwrite_existing:true` 后返回原内容（≤500 字）便于恢复。 |
| `app_key` | **`app`** **`combo`**、`window_id?` `coordinate?` | 见 §1.6。 |
| `app_scroll` | **`app`** **`dy`**、`window_id?` `coordinate?` | 见 §1.6。 |
| `app_focus` | **`app`**、`window_id?` `coordinate?` `element_index?` | 不点击地给元素键盘焦点；应用在最前、在表单 sheet 里、Open/Save 面板持有焦点、密码框时拒绝。 |
| `app_drag` | **`app`**、`window_id?` `coordinate?` `to_coordinate?` `path?` | 直线（coordinate→to_coordinate）或 path；path 不能与其他目标参数同用；以原始输入投递，部分应用会短暂变活跃。 |
| `app_menu` | **`app`**、`path?`（1–16 项）`list?`（string / array / null） | path 按标题逐级按下叶子；list 列子项（null 列顶层）；二者只给一个；⌘ 快捷键改用这个。 |
| `app_batch` | **`app`** **`actions`**、`window_id?` | action 枚举 `Xt` = `click,type,key,scroll,drag,screenshot,zoom`；遇错或 `unsupported` 停，`ineffective` 不停，"Not confirmed" 停；无目标的 type/key 沿用上一个动作的点；子动作间 10ms；结果 `"— actions[i] x: ok|STOPPED —"`，末尾 `"All N actions ok."`。 |
| `app_release` | `app?` `window_id?`（需配 `app`） | 不带参数释放本会话全部 app 锁 → `"All app locks released. Display-scope tools are now available."`。 |
| `app_bring_to_current_space` | **`app`** **`window_id`** | 见 §1.6。 |

---

#### 1.2.1 app_click 在系统应用上的路径（Finder 列表行 / 图标视图 / 桌面 / Dock）

来源：`asar/node_modules/@ant/claude-swift/build/Release/computer_use.node`（`otool -tV` 反汇编；Swift 小字符串是
`mov/movk` 立即数，按小端解码；角色集合是 `__DATA` 里的静态数组，`swift_once` 初始化）。偏移只对本版本有效。
JS 侧（`BEf0UhNC` `ir()`）只把原生结果的 `axOp` / `reasonCode` 组织成文字，**走哪条 AX 路径完全由原生 `dispatch` 决定**。

- **点击梯子** `0xbbc8`（调用方 `0xa02c` / `0xafdc`），动作执行 `0x223ac(element, action, …)`，选中执行 `0x2c064`
  （`AXUIElementSetAttributeValue(el, "AXSelected", true)` 后 `AXUIElementCopyAttributeValue` 读回；失败分支 → `select_refused`）。
  三个角色集合（`0x8fa4/0x8fbc/0x8fd4` → 数组 `0xe7190/0xe71e8/0xe7240`）：
  文本 `{AXTextField, AXTextArea, AXSearchField}`、数值 `{AXSlider, AXScrollBar, …}`、**行 `{AXRow, AXCell, AXColumn, AXOutlineRow}`**。
- **左键（菜单 / 弹出菜单判断之后）的顺序**：
  1. 起点角色是文本集合：若它在一行里（`0x2bd7c` 读该行的 `AXSelected`）→ `set AXSelected=true (row of the text)`（选中那一行，
     不进文本）；否则按文本处理（放插入点 / 双击选词、三击选行，`set AXSelectedTextRange=word{…}` / `line{…}`）。
  2. 起点角色是行集合：只有**在网页里**（祖先有 `AXWebArea`，`0x1c214`）且有 `AXPress` 才 `AXPress`；否则
     `count ≥ 2` 且动作里有 `AXOpen` → **`AXOpen`**；其余（单击，或没有 AXOpen 的双击）→ **`set AXSelected=true`**。
  3. 其他元素：自己有 `AXPress` → `AXPress`；否则上溯找可按的祖先（`0x2fc28`）→ `AXPress`；否则上溯找可选中的祖先
     （`0x30798`：到 `AXWindow` 为止、不跨 `AXWebArea`，看 `AXSelected` 可写；同一函数也查 `AXOpen`）→ `count ≥ 2` 且有 `AXOpen`
     → `AXOpen`，否则 `set AXSelected=true (ascended)`；都没有 → `(none)`，JS 给 `canvas`。
  - 原生字符串里**没有** `AXSelectedRows` / `AXSelectedChildren`：官方不写父级的选中列表，只写行（或上溯到的元素）自己的 `AXSelected`。
  - 官方没有 `no_press_action` 这个原因码；"什么都按不了"是 `canvas`，"选中被拒"是 `select_refused`
    （文案大意：通过辅助功能选中这一行被拒绝，改点具体的单元格或用键盘导航）。弹出菜单类是 `popup_menu`。
- **Finder 列表行**：行是 `AXRow`（无 AXPress），名字是行里的 `AXTextField`、其余列是 `AXCell` 里的 `AXStaticText`。
  单击 = `set AXSelected=true`（打在名字上是 `(row of the text)`，打在别的列是行本身或 `(ascended)`），**不发任何鼠标事件**；
  双击 = 行有 `AXOpen` 就 `AXOpen`，没有就只选中。没有 "app_menu File ▸ Open" 的自动改道。
- **Finder 图标视图**：项目不在行集合里，走第 3 条：没有 AXPress 时上溯到 `AXSelected` 可写的元素 → 选中 / 双击 `AXOpen`。
  （图标项的具体角色本步没有实机确认：锁屏，见进度日志。）
- **桌面、Dock**：官方 app_* 工具**到不了**——`Zt()` 要求目标 bundle id 恰好在授权列表里，而官方的已安装应用枚举只扫
  `/Applications`、`/System/Applications`（Finder 单独加 `/System/Library/CoreServices/Finder.app`，`BEf0UhNC:L3997`），Dock 不在其中；
  `He()` 只把 `com.apple.finder` 当桌面外壳。桌面图标、Dock、Spotlight 只能用 display-scope 的点击，且要 Finder 授权
  （`L1674`："这一个授权覆盖全部"）。原生里 `com.apple.dock / SystemUIServer / Dock / Spotlight / Control Center` 名单用于
  命中测试的窗口归属，不是 app_* 目标。
- **本 build 的取舍**（无 display-scope 工具）：Dock 作为可授权应用（`apps.cjs` 扫 CoreServices，已有行为）走 app_click；
  Dock 项 `AXDockItem` 有 `AXPress`，按官方梯子第 3 条就是 `AXPress`。Dock 的 AX 树没有 `AXWindow`（`AXApplication ▸ AXList ▸
  AXDockItem`），所以原生用应用元素代替窗口、按窗口边界过滤（`AXLadder.windowlessShells`）。桌面窗口仍被
  `excludeDesktopElements` 排除，app_* 不可达（与官方一致：桌面属 display-scope）。

#### 1.2.2 app_drag 在系统应用上

- 官方 app_drag 在本机走原始输入（`supportsRawInput`），结果是 `ok (delivered via raw input …; … unverified — confirm the effect
  with app_screenshot …)`；**没有**按 bundle id 区分系统应用的原因码，也**没有** AX 等价的拖拽。官方拖拽相关的拒绝只有
  `gtk_background_drag`、`system_drag_session`（起点是链接 / 图片）、`popup_menu`（起点是弹出菜单）、`non_text_drag`（无原始输入时）。
- 本 build：读回不变一律 `drag_ineffective`（用户先前确认的读回映射），删除自造的 `system_app_ignores_posted_events`。
  Finder 拖文件进子目录已实测可用（`docs/computer-use-drag.md`），保持。

### 1.3 teach 工具（`Fe()` `L1189–1256`，处理 `$r` `ri` `ii` `L4402–4637`）

共用 step schema `r`：`explanation*`（提示框正文，教学模式下用户只看得到它）、`next_preview*`（一行"点下一步会发生什么"）、
`anchor?`（`[x,y]` 箭头指向，按全屏截图坐标；缺省居中无箭头）、`actions*`（同 `computer_batch.actions` 项 schema，可为空数组）。

| 工具 | inputSchema | 语义与返回 |
|---|---|---|
| `request_teach_access` | **`apps`** **`reason`** | 用户想"学"时代替 request_access；批准后主窗口隐藏、出现全屏提示层；无剪贴板/系统键 flag；回合结束自动退出。拒绝 → `teach_declined`；教学中再调 → `teach_mode_conflict`；批准后拿全屏锁（`acquireTeachLockPostConsent`，同时 `approveTakeover("teach")`），抢不到 → `cu_lock_held`。返回 `{granted, denied, …, teachModeActive}`。 |
| `teach_step` | step schema（`explanation` `next_preview` `actions` 必填） | 显示一个提示，等用户点 Next；然后执行 actions（动作枚举 `Ji` = batch 枚举去掉 `zoom`，`L5396`）并自动截图。返回 `{executed, results:[{action,ok,output}]}` + 截图；Exit → `{exited:true}`；动作出错 → `{executed, failed, remaining}`。 |
| `teach_batch` | **`steps`**（≥1 个 step） | 一次排多个提示，先全部校验；返回 `{stepsCompleted, results}` + 最终截图；Exit → `{exited:true, stepsCompleted}`；出错 → `{stepsCompleted, stepFailed, executed, failed, remaining, results}`。批内锚点和坐标都按批前截图。 |

---

### 1.4 request_full_control / release_full_control 与模式

#### 1.4.1 模式与偏好

- **偏好** `chicagoPreferredMode`：`"background"`（默认）或 `"full_control"`。设置页 Settings → This computer → Computer use
  的分段控件（`c71860c77@58177`）：标题 "How Claude uses the apps you allow"，说明
  "Background: Claude works inside the apps you allow while you keep using your computer, and asks your permission before taking full control of your screen. Full control: Claude takes control of your screen, mouse, and keyboard by default whenever Claude uses an app you allow, without asking again."，
  两段 "Background" / "Full control"；app 级能力不支持时禁用并固定显示 full_control。
- 服务端读取：`getPreferredMode = toolsIncludeAppScoped ? dk() : undefined`；
  `getTakeoverConsentMode = (backgroundModeOffered ||= Or()) ? dk() : undefined`（`B5tintml@51019`）。
- request_access 结果附 `preferredModeGuidance`（`Qt()` `L2297`）：background 时要求优先 app_*，只有 app_* 返回 unsupported
  且无别的路才回退全屏工具，并预期另有批准卡；full_control 时优先 screenshot/left_click 等，app_* 仍可用于不打扰用户的小操作。
- 首次启用后台模式的介绍弹窗（`va` `ca31fdde5@45370`）：标题 "Background computer use" + 中性徽章 "Beta"；正文说明后台控制、
  需要全屏时会征求同意、可在设置改默认；按钮 "Not now"（secondary）/ "Continue"（primary）；点 Continue 写
  `chicagoBackgroundIntroSeen=true`。

#### 1.4.2 状态机

状态量（本机锁管理器 `pw`，`muI2IV6k@≈3903500–3907200`）：

- `exclusiveHolder`：全屏锁（"显示器锁"）持有会话。`cuLockChanged` 事件驱动光晕（见 `docs/computer-use-glow-design-20261020.md`）、
  停靠条与全局 Esc。
- `appHolders`：`bundleId:windowId → sessionId` 的 app 锁；`hadAppLock`：会话最近锁过的应用。
- `takeoverApproved: Set<sessionId>`：接管已批准。`needsTakeoverConsent(s)`（`@3904472`）：已批准 → undefined；
  否则返回该会话当前持有 app 锁的 bundle 列表，没有就返回 `[hadAppLock]`，再没有 → undefined。
- `approveTakeover(s, via)` / `revokeTakeover(s)` / `isTakeoverApproved(s)`；`withTakeoverRequestDedupe` 同会话并发请求只弹一张卡。

转移（服务端调度 `ua()` 闭包 `BEf0UhNC:L5642–5903`）：

1. **触发条件** `_`：本次是 display-scope 动作（`Or()`：除 request_access/teach/list_* /wait/cursor_position/switch_display 外）
   或（无模式时的）cursor_position；不是只读 batch；尚未批准；并且 `needsTakeoverConsent` 有值（曾经/正在后台控制）
   **或** 同意模式是 `"background"`。
2. 偏好为 `full_control` → 不弹卡，`approveTakeover("preferred_full_control")`。
3. 否则：无人值守 → `unattended_no_approver`；没接卡片处理 → `takeover_unavailable`（提示先调 request_full_control）；
   弹接管卡（超时 `ia = 290000ms`）：同意 → `approveTakeover("dialog")`；超时 → `takeover_not_answered`；拒绝 → `takeover_declined`
   （说明这与授权应用是两回事，request_access 拿不到它）。
4. 没有持有者且非只读工具 → `acquireCuLock()`（光晕亮、Esc 注册），再确认 `isSelf`，失败 → `cu_lock_held`；随后 `approveTakeover`。
5. 另一会话持有全屏锁 → 所有工具 `cu_lock_held`（`na`："Another Claude session is currently using the computer…"）。

`request_full_control`（`Ln()` `L2886`，无参数 `{}`）：

- 已批准或偏好 full_control → `"Full-screen control is already available for this session; …"`。
- 无人值守 → `unattended_no_approver`。
- 有卡片处理 → `onTakeoverRequest({becausePreferredBackground:true})`；超时（dialogSignal aborted）→ `takeover_not_answered`；
  未同意 → `takeover_declined`。
- 同意 → `approveTakeover("request_full_control")`，返回 `"Full-screen control approved for this session. … This approval lasts until the session ends."`。
  **它只记批准，不拿锁**；锁在下一次 display-scope 动作时拿。

`release_full_control`（`Bn()` `L2928`，无参数）：`releaseCuLock()`（光晕灭）+ `revokeTakeover()`（下次全屏动作重新问），
不弹卡，返回 `"Released full-screen control. The display overlay is off. …"`。

**释放时机**：

- 显式 `release_full_control`。
- 回合结束：`onResult`（`CB6cNSrW@192152`）/ `finishTurnCleanup`（`@497232`）在非教学模式下 `pw.release(session)`
  （全屏锁 + 全部 app 锁），发 `cu_lock_released`；同时恢复剪贴板暂存、自动取消隐藏（`chicagoAutoUnhide`）。
  **接管批准不随回合结束清除**（只在 `forgetSession` 时清），所以"本会话批准一次"。
- 用户按 Esc：全屏锁在时注册全局 `Escape`（`JNr` `muI2IV6k@4014294`），`GNr`（`@4013845`）停掉全屏持有者和所有 app 模式会话；
  模型自己合成的 Escape 会被吞掉（`VNr` 计数 / `HNr`）。
- 远程桥（`BZtMzTi2`）另有空闲、过期规则：批准记录 `takeoverApprovedAt` 超过 24h（`_ = 864e5`）或空闲超时即作废（`U()` `L254–279`）。

#### 1.4.3 与 app_* 的互斥 / 共存

- 持有任何 app 锁时，display-scope 工具（`Or()` 名单）一律拒绝 `state_conflict`：
  "This session is currently controlling X in the background. Use the app_* tools, or call app_release first…"（`L5568–5575`）。
  `app_release` 描述也写明"二者在一个回合内不能混用"。
- 持有 app 锁时 `read_clipboard` / `write_clipboard` 拒绝（`Ti()` `L5137`）：要用剪贴板先 app_release，再走 display-scope（会请求接管）。
- 持有 app 锁时 `cursor_position` 返回后台版落点（`Ii`）；`open_application` 后台打开不抢前台。
- 同一会话持有全屏锁时仍可用 app_*（锁管理器 `acquireApp` 只拒别的会话的全屏锁）；别的会话持全屏锁 → app_* 报锁占用（`app_release` 除外）。
- 远程配置关掉 app 级能力时，app_* 返回 `feature_disabled`（`Nr` `L5963`）并释放全部 app 锁，引导改用 display-scope。

#### 1.4.4 授权卡（接管卡）

主进程把接管请求包装成一次 `onComputerUsePermissionRequest`（`B5tintml@49577`）：

```
{ requestId: `takeover-${Date.now()}`,
  reason: becausePreferredBackground ? "Full-screen control (your preferred mode is Background)"
                                     : "Switch from background control to full-screen control",
  apps: [], requestedFlags: {}, screenshotFiltering, hostPlatform,
  takeoverFrom: { becausePreferredBackground: true } | { bundleId, displayName, displayNames } }
→ allowed = (result.userConsented === true)
```

渲染层 `ya()`（`ca31fdde5@46513`）按 `featureDisabled` → `tccState` → `takeoverFrom` → 普通授权卡分派。接管卡 `wa()`（`@47518`）：

- 容器 `div.rounded-lg.p-3.bg-surface-1.border`；首行 `flex items-start gap-2 mb-3`：图标 `Interactive`（customSize 16，
  `text-secondary mt-0.5 shrink-0`）+ `p.font-semibold.text-body.text-primary`。
- 文案三选一：
  - `becausePreferredBackground`："Take over the screen? You’ve set Background as your preferred mode, so Claude is checking before switching to full-screen control."（id `7s2VxEaWpi`）
  - 有应用名："Take over the screen? Claude was working on {appName} in the background and now needs full-screen control."（`SHlXyyk+z2`，多个名用 conjunction 列表，最多 64 个/4000 字）
  - 其他："Take over the screen? Claude was working in the background and now needs full-screen control."（`wsMb6SyXPb`）
- 设备行 `Bi`（远程时 "On {deviceName}"），`ms-7 -mt-2 mb-3`。
- 按钮行 `flex gap-2 ms-7`：secondary "Stay in background"（`gJXGKrdJQm`，快捷键 cmd+.）；primary "Allow"（`y/bmsG8rnv`，cmd+enter；
  单次放行时文案 "Allow for this session"）；两个按钮 `!font-semibold !text-caption !h-9`。
- 决定：同意 → `_cuGrants = {granted:[], denied:[], flags:全 false, userConsented:true}`，"always"；拒绝 → "deny"。

普通授权卡 `ka()`（`@50199`）和标题 `ja()`（`@52183`）："Claude wants to use your computer" / "Claude wants to:" /
"Claude wants to use {appName}" / "Claude wants to use:"；能力行 `Vi()`（`@39673`）：应用行（层级徽章 View only / Click only / All，
已授权显示 "Already allowed"）、`Clipboard` 图标 "Read your clipboard"、`Copy` 图标 "Write to your clipboard"、
`Keyboard` 图标 "Use system shortcuts (⌘Q, ⌘Tab, and similar)"；`preferredModeDefault==="background"` 时附
"Claude will work in these apps in the background while you keep using your Mac."，否则有 `willHide` 时说明会隐藏其他窗口
（`autoUnhideEnabled` 决定"完成后恢复"版）。按钮 "Deny"（cmd+.）/ "Allow for this session"（cmd+enter）。
（这些卡的 CSS 来源见 `docs/computer-use-ui-css-source-20261020.md`。）

#### 1.4.5 tier 与前台应用检查

- **层级来源** `Xor(category)`（`muI2IV6k@3655923`）：`browser`、`trading` → `read`；`terminal`、`shell` → `click`；其余 `full`。
  授权时 `proposedTier = kA(bundleId, name)`，授权卡显示，用户只能整体允许/拒绝；`cuOnlyMode` 下全部升为 full（`a()` `L45–60`）。
  首次请求浏览器/终端时先返回一次 `restricted_app_first_request` 说明（同回合重试才弹卡，`L4103–4122`）。
- **闸门类型**（`at(tier, kind)` `L1424`）：`mouse_position`（无按键移动）任何层级放行；`mouse`（左键单击、滚动、拖拽起点、按下/松开）
  需 click 或 full；`mouse_full`（右/中键、带修饰键、拖拽终点、按住时滚动）与 `keyboard`（type/key/hold_key/粘贴）需 full。
- **前台检查** `V()`（`L1498`）：每个动作取最前应用（键盘类用 `getFrontmostApp`，其余 `dt()`），查其授权层级：
  - 够 → 再做存储面板 / 文件对话框等子检查后放行，返回 `approvedFrontmost` 供投递前复查（`H()`）。
  - `read` 层 → `tier_insufficient`（浏览器提示用 Claude in Chrome）。
  - `click` 层 + 键盘 → `tier_insufficient`（说明会打进终端；shell 命令用 Bash）；`click` 层 + `mouse_full` → 说明右键菜单有粘贴。
  - 桌面外壳（Finder/Dock/桌面）在前 → `app_not_granted`，要求 request_access `"Finder"`（一个授权覆盖桌面、Dock、Spotlight）。
  - Claude 自己的窗口在前：鼠标放行，键盘 → `state_conflict`（先点目标应用）。
  - 未授权应用在前 → `app_not_granted` + `lt()` 的引导（可授权就给出 request_access 用的名字）。
- **命中测试** `U()`（`L1625`）：点落在哪个应用（`appUnderPoint`）；无 bundle 的窗口 → `unattributed_window`；系统菜单栏在前台应用已授权时放行；
  落在 Claude 覆盖层 → `hit_test_self_intercept`；落在桌面外壳 → 要 Finder 授权；落在未授权应用 → `app_not_granted`；层级不够 → `pt()`。
- `hideBeforeAction`（子门，默认 true，仅显式授权集）：截图/动作前把非允许名单应用隐藏（`prepareForAction`），回合结束可自动恢复；
  结果里说明哪些被隐藏。
- `open_application` 在任何层级都可用（拉到前台算读级）。
- 子门默认值 `vlr`（`muI2IV6k@3683852`）：`pixelValidation:false, clipboardPasteMultiline:true, mouseAnimation:true,
  hideBeforeAction:true, autoTargetDisplay:true, clipboardGuard:true, maskFailClosed:true, adaptiveResolution:true`。

**后台偏好下的 `open_application`**（`ua()` `L5713–5797`）：未持锁、偏好 background 时不走接管——
已有可达窗口 → 告诉模型用 app_*，需要全屏时下一次 display-scope 调用会弹卡/接管；窗口全在别的 Space → 建议 app_bring_to_current_space；
最小化/隐藏 → 引导；都没有 → `openApp(id,{activates:false})` 后台启动，返回 `window_id`。

#### 1.4.6 显示器

- `selectedDisplayId` 由截图解析器更新（`onResolvedDisplayUpdated`）；`switch_display` 钉住（`displayPinnedByModel`），`auto` 解除。
- `autoTargetDisplay`：按允许应用窗口所在显示器自动选，允许集变化时重算（`displayResolvedForApps`）。
- request_access 结果在多显示器时附 `windowLocations`（`Ur()` `L4169`）：每个授权应用的窗口在哪些显示器、是否主屏。
- 光晕跟随持有者的显示器（`switch_display` 时移动），细节见光晕设计文档。

---

### 1.5 剪贴板

#### 1.5.1 授权 flag

- `request_access` 入参 `clipboardRead` / `clipboardWrite` / `systemKeyCombos`（`L525–538`），默认值 `Yor = {clipboardRead:false,
  clipboardWrite:false, systemKeyCombos:false}`（`muI2IV6k`，紧挨 `qor="com.anthropic.cu.screen"`）。
- 只把**尚未授予**的 flag 放进 `requestedFlags`（`L4076–4078`）；卡上以独立能力行显示（见 1.4.4），整卡允许即一并授予。
- 远程桥每个 flag 单独记批准时间，24h 后单独过期（`BZtMzTi2:L274–277`）。

#### 1.5.2 read_clipboard / write_clipboard

- 预检 `jr()`（`L5933`）：没 flag → `grant_flag_required`："Clipboard read|write is not granted. Request `clipboardRead|clipboardWrite` via request_access."；
  write 缺 `text` → `bad_args`。
- 持有 app 锁 → `state_conflict`（`Ti()`）。
- 它们是 display-scope 工具：走接管/全屏锁流程（`Or()` 包含它们）。
- `read_clipboard`（`Oi()` `L5149`）：`clipboardGuard` 开时按前台应用层级调 `ot()`；返回 `{"text": "..."}`。
- `write_clipboard`（`Ai()` `L5164`）：前台是 click 层应用 → `tier_insufficient`（下一步会被清空，click 层的粘贴按钮不能用来注入文字）；
  否则 `writeClipboard(text)` → `"Clipboard written."`。

**clipboardGuard**（`ot()` `L1434`）：前台/目标是 click 层应用时，把当前剪贴板暂存（`onClipboardStashChanged`）并清空；
离开 click 层后写回暂存；回合结束（`CB6cNSrW@192152`）若仍有暂存就恢复。防止通过终端/IDE 的粘贴注入文字。

#### 1.5.3 type 的剪贴板快速路径

`hi()`（`BEf0UhNC:L4895–4935`）判定：

- macOS / Linux：`text.includes("\n") && grantFlags.clipboardWrite && subGates.clipboardPasteMultiline`。
  **触发条件是"含换行"，没有长度阈值**；没有 `clipboardWrite` 授权就不走。
- Windows：`text.length > 16 && clipboardPasteMultiline`（不看授权）。

命中后：投递前复查前台（`"Paste aborted before delivery"`），`executor.type(text,{viaClipboard:true})` → `"Typed (via clipboard)."`。

执行器 `DPr(input, clipboard, text)`（`muI2IV6k@4019160`）：

1. `old = clipboard.readText()`（失败只记日志，不恢复）。
2. `writeText(text)`，再 `readText()` 校验往返一致，不一致抛 `"Clipboard write did not round-trip."`。
3. 按粘贴键 `EPr`（`@4019089`）：macOS `["command","v"]`，其他 `["ctrl","v"]`。
4. 等 100ms。
5. `finally`：`old` 是字符串就 `writeText(old)` 恢复（失败只记日志）。

注意：只按纯文本保存/恢复，原剪贴板若是图片或富文本，恢复后只剩文本（`readText` 的结果）。

没命中快速路径：`typePaced(text, 8)`（原生 `typeTextPaced`，`kPr` `@4021813`）；再不行逐字素 8ms。

---

### 1.6 app_key / app_scroll / app_bring_to_current_space

#### 1.6.1 app_key

schema（`L984–1007`）：`{app*, window_id?, coordinate?, combo*}`；`combo` 例："return" "escape" "backspace" "cmd+a" "tab" "shift+tab"
"down" "shift+right" "pagedown"；"delete"/"del" 删光标前一个字符，"forward_delete" 删后一个。

描述（原始输入版）要点：return/escape/backspace/cmd+a 在支持时通过 AX 作用于 (x,y) 处元素；其余（以及 tab、方向键含 shift/cmd/option、
home/end/pageup/pagedown）作为按键发给窗口内的键盘焦点，所以先 app_click 再 app_screenshot 验证；⌘ 快捷键用 app_menu；
后台原生应用会忽略 cmd+a 按键所以拒绝；Keynote 类画布改整框文字的按键顺序；escape 只按一次。

处理（`fr()` `L3714–3732`，层级 full）：

- `gn(combo)` 规范化；必须恰好一个非 fn 主键，否则 `bad_args`（"send repeated keys as separate app_key calls"）。
- 系统组合且无 `systemKeyCombos` → `grant_flag_required`。
- 会动剪贴板的组合（`_A()`，如粘贴/复制）→ `state_conflict`："… would touch the system clipboard. Use app_type for text entry."
- 之后 `{kind:"key", combo}` 进 `ir()`；secure input 激活时拒绝。

返回：

- AX 成功：`"ok (<axOp> on <role> '<title>' via …)"`，可能附"此字段已持有键盘焦点"等。
- 原始按键：`"ok (delivered via raw input on …; there is no accessibility action for this key so this is unverified — confirm the effect with app_screenshot …)"`；
  `cmd+a` 时说明可能被忽略，或"Select All 在后台禁用，未发送"。
- unsupported：`feature_unavailable`，`"This element (…) cannot be sent that key while X is in the background — <原因>."`；
  常见原因 `key_not_mapped`（列出后台可发的键）、`key_cannot_be_aimed`（element_index 不能瞄准按键）、`menu_command_disabled`、
  `would_replace_content`（有选区会被替换）、`window_off_space`、`window_minimized`/`app_hidden`（引导 app_bring_to_current_space）。
- 弹出原生菜单：`"After this key press … a native pop-up menu … The key itself was delivered: do not send it again."`。

#### 1.6.2 app_scroll

schema（`L1009–1026`）：`{app*, window_id?, coordinate?, dy*}`。`dy` 正数向下、负数向上；每单位约为窗口滚动范围的 5%
（设的是滚动条值，不是像素），到顶/底饱和，建议 2–5 后重新截图。

处理（`L3733–3743`，层级 click）：传了非 0 的 `dx` → `feature_unavailable`
（"app_scroll only supports vertical (dy). Horizontal scroll is not implemented for the background AX path — use display-scope `scroll`…"）；
否则 `{kind:"scroll", dx:0, dy}` 进 `ir()`；滚动跳过 `Ut()` 的目标预检。返回同 `ir()` 的通用格式：`"ok (…)"`、
`ineffective: …`、或 `"cannot be scrolled while X is in the background — …"`（如 `horizontal_scroll`）。

原生侧（`computer_use.node` 静态反汇编，函数 `0x3134c`，由 dispatch `0xa06c` / `0xb000` 调用；偏移只对本版本有效）：从目标元素沿
`AXParent` 上溯比对角色找 `AXScrollArea`，取其 `AXVerticalScrollBar`，读 `AXValue`（`doubleValue`），新值 = `cur + dy × 常量`
（`fmul` 后 `fadd`）再 `fminnm 1.0` 与 `0.0` 比较截断，写回后读回。axOp 字符串：`"set scrollbar AXValue="` + `%.2f`（成功）、
`"set scrollbar AXValue"`（写失败）、`"read scrollbar AXValue"`（读失败）；原因码字符串里有 `horizontal_scroll`。JS `ir()` 对 scroll
不做 `Ut()` 预检、不加 `aimedAtListedElement`，也不查 secure input（那只对 type/key）；落点照常记入 `lastWindowPt`（被拒、
或 ineffective 且有 axError 时不记）。批处理里 ineffective 是 `N()`（非错误），不停批。

#### 1.6.3 app_bring_to_current_space

schema（`L1170–1183`）：`{app*, window_id*}`（`window_id` 来自 app_list_windows）。仅 `supportsRawInput` 时注册；层级 read。

处理 `In()`（`L2805–2885`）：

1. 屏幕锁定 → `state_conflict`；执行器没有 `bringWindowToActiveSpace` → `feature_unavailable`；`window_id` 非整数 → `bad_args`；
   窗口不属于该应用 → `app_not_granted`；`un()` 检查 app 锁。
2. 窗口最小化或应用隐藏（`Jn()`）：`showWindowBehindTheFrontWindow`，结果码表 `Yn`（`L3103–3133`）：
   `shown_behind_the_front_window`（回到用户窗口后面、不抢焦点）、`shown_above_the_front_window`、`shown_with_no_front_window`、
   `shown_and_now_in_front`（要告诉用户）、`still_parked`、`user_is_in_the_app`、`front_window_cannot_be_raised`、`unavailable`。
   回来了但在别的 Space → 提示再调一次。
3. 先 `dryRun`：已在当前 Space → `"Window N is already on the current Space — no move needed. …"`；错误码 `Vn()`（`L2941`）：
   `owner_mismatch`（`app_not_granted`）、`space_unclassifiable`、`fullscreen_space`（当前是全屏 Space，不能移入）、`op_unavailable`
   （`feature_unavailable`）。
4. 真移动前再查锁屏、`windowOwner` 未变，然后 `bringWindowToActiveSpace({bundleId, windowId})`：
   成功 → `"Window N of X is now on the current Space (the app did not take focus). Take a fresh app_screenshot next …"`；
   未在时限内出现 → `state_conflict`（可能还在移动）。
5. 失败路径在 `finally` 里释放本次临时拿的 app 锁。

补充（2026-10-21，只读静态查看）：执行器（`muI2IV6k`）的 `bringWindowToActiveSpace` 先 `windowOwner(windowId)` 核对 bundleId
（不符 → `owner_mismatch`），再经独立辅助进程 `app-cu-helper`（`Claude.app/Contents/Helpers/app-cu-helper`，Rust）的 JSON-RPC
`bringWindowToActiveSpace {pid, windowId, hostPid, dryRun}`，异常一律 `op_unavailable`。`app-cu-helper` 的字符串里有
`SLSGetActiveSpace`、`CGSCopySpacesForWindows`、`CGSSpaceGetType`、`SLSGetWindowOwner`、`SLSDisableUpdate`/`SLSReenableUpdate`、
`SLSBridgedMoveWindowsToManagedSpaceOperation` + `initWithWindows:spaceID:`、`skylight_symbols_missing`、
`move_window_to_space called off main thread`。`showWindowBehindTheFrontWindow` 在 `computer_use.node` 里（字符串 `AXMinimized`、
`unhide`、`ParkedWindow`、`OnScreenWindow`、`WhatToKeepOnTop`，并导入 `SLSGetWindowTags`）；执行器在结果是 `shown_*` 且前台变成目标
pid 时改报 `shown_and_now_in_front`，并对前台被抢的情况挂"焦点被抢守卫"把用户的应用放回。

无人值守时最小化/隐藏窗口的引导改为"需要事先批准"（`Kn()` `L3092`）；`jce`（`muI2IV6k@≈121900`）把
`app_bring_to_current_space`、`request_full_control`、`request_access`、`request_teach_access` 归为需要用户交互的一类。

#### 1.6.4 原生接口（参考）

`node_modules/@ant/claude-swift/build/Release/computer_use.node` 导出签名里可见：`appUnderPoint(x,y)`、`captureRegion(...)`、
`resolvePrepareCapture(allowedBundleIds, hostBundleId)`、`prepareDisplay(...)`、`probe(bundleId, windowId, x, y, intentJson, dryRun, target?)`、
`menu(bundleId, {mode,path})`、`setPhantomCursor(screenX, screenY, windowId?, pulse?)`、`showWindowBehindTheFrontWindow(pid, windowId)`、
`armFocusStealGuard(...)`、`toggleSubstitutions(...)`、`windowNumberAtPoint(...)`、`setOwnWindowClickThrough(...)` 等。
`bringWindowToActiveSpace`、`typeTextPaced`、`mouseScroll` 在 `.node` 字符串里**未找到**对应签名文本（可能走别的导出名，未深挖）。

---

### 1.7 未找到 / 未展开

- CLI 侧（`work/claude-cli-*`）computer-use 实现：未找到。
- 系统级组合键清单 `yA()`、剪贴板组合清单 `_A()`、`wA()` 组合校验的具体条目：在 `muI2IV6k` 导出里，未逐条展开。
- `t.ck()`（只有 batch 模式）与 `qe()`（alwaysLoad）对应的 GrowthBook 键名：未展开。
- 远程桥工具前缀 `computer_*`（`muI2IV6k@≈3140146` 的 `HBn` 清单）与 `computer_resolve_access` 流程：本地 Desktop 不需要，未展开。

---

## 二、UI 与 teach

本节只读源码，补「一、工具面」里没有展开的界面与产品行为。新增引用约定：

- `ca31fdde5@N` / `c96d752d0@N` / `shared-6@N` / `c752b32f8@N` / `shared-8@N` / `cc1aae219@N`：`ion-dist/assets/v1/` 下渲染层 chunk 的字节偏移（`c96d752d0` 是 Code 页审批卡，`ca31fdde5` 是聊天 / Cowork 审批卡）。
- `muI2IV6k@N`：主进程 chunk 字节偏移（同一）。
- `cu.node@0xNNNN`：`asar/node_modules/@ant/claude-swift/build/Release/computer_use.node`（arm64，已 strip）的虚拟地址，用 `otool -tV` 反汇编、`otool -oV` 看 ObjC 元数据得到；浮点常量按 `__TEXT` 文件偏移 = 地址读取。反汇编副本只在会话 scratchpad，不入库。
- 文案后括号里是 i18n id，`ion-dist/i18n/en-US.json` 可查；没有 id 的是主进程内联 HTML 里的硬编码英文（官方没做本地化）。

### 2.0 先说结论：官方有两件"教学"相关的东西，方向相反

| | **teach（引导教学）** | **watch-record（录一个技能 / Record a skill）** |
|---|---|---|
| 方向 | **Claude 教用户**：屏幕上逐步弹提示框，用户点 Next，Claude 执行这一步的动作 | **用户教 Claude**：用户录屏示范一遍（可配语音讲解），录完作为一条带截图的轨迹发给 Claude，默认让它写成技能 |
| 工具 | `request_teach_access` / `teach_step` / `teach_batch`（模型调用） | 无模型工具；用户从 UI 入口发起，结果作为一条用户消息附件进入对话 |
| 前台 UI | 授权卡（GraduationCap） + 全屏透明提示层 `cu-teach-*.html` | 选择器窗口 + 底部录制胶囊 `cu-watch-record-pill-*/index.html` + 光晕 |
| 依赖 | display-scope：锚点与动作都是**全屏截图坐标**，动作项 = `computer_batch` 动作枚举去掉 `zoom` | 原生录制器（`watchRecorder` / `InputRecorder`）、麦克风转写、截图；门控 flag `cowork_watch_record` |
| 设置页 | 官方设置页（`c71860c77`）**没有** teach 或录制条目 | 同左；入口在 Customize → Skills → 添加菜单、输入框 + 菜单、麦克风菜单 |

用户在需求里说的"用户示范一遍，模型学下来"对应的是 **watch-record**，不是 teach 三件套。两者都没有设置页入口；本项目现有的"设置页入口 + 空态"在官方没有对应物。**需要用户决定**：只照官方做 teach（Claude 引导用户），还是连 watch-record 一起做（它是另一整套原生录制 + 转写 + 轨迹打包，工作量远大于 teach）。下文两者都写。

---

### 2.1 teach：授权卡 `request_teach_access`

源码：`ca31fdde5@61233` 起，`Ha(e)` 判定 `e==="computer:request_teach_access"`，卡体 `Ua`（memo 后导出为 `Wa`），由 `za`/`Ba`（`scrollIntoView({block:"nearest",behavior:"smooth"})` 包一层）分派：`input.tccState` 存在 → TCC 卡 `Na`，否则 → `Wa`。`c96d752d0`（Code 页 epitaxy 卡）里没有 teach 分支；Code 页实际复用哪张卡未确认（`shared-78` 的 `COMPUTER_USE_PERMISSION` 集合把 `computer:request_teach_access` 当作 CU 权限请求，`REQUIRES_INPUT` 也包含它）。

#### 2.1.1 markup（可直接复制的 class 串）

```
div[data-approval-root]  mb-4 overflow-hidden rounded-card border bg-surface-panel shadow-lg
└─ div  p-md
   ├─ div  mb-1 flex items-start gap-2
   │   ├─ Icon name="GraduationCap"  className="shrink-0 text-secondary"
   │   └─ span  font-semibold text-body text-secondary        "Let Claude guide you step by step?"（noiXNtwHHN）
   ├─ p  ms-7 mb-2 text-body text-secondary                  {reason}（经 ge(he(reason)) 净化后的纯文本）
   ├─ p  ms-7 mb-3 text-footnote text-muted-as-secondary
   │     "The Claude window will hide. A tooltip appears next to each step with a Next button. Click Exit anytime to stop."（JxbU5lJ3LM）
   ├─ div  ms-7 mb-3 divide-y rounded border bg-surface-1    （apps.length>0 时）
   │   └─ Ui（应用行，见下） × N，key = resolved.bundleId ?? `unresolved-${i}`
   ├─ p  ms-7 mb-3 text-body text-secondary                 （willHide 非空时）
   │     autoUnhideEnabled ? "Your other windows will be hidden, then restored when Claude is done."（isEpzl+um7）
   │                       : "Your other windows will be hidden while Claude works."（yNyU0xuMGA）
   ├─ p  ms-7 mb-3 text-footnote text-muted-as-secondary    （screenshotFiltering==="none"，仅 Windows）
   │     "On Windows, Claude can see all open apps. Actions on apps not allowed here are rejected."（j0Qa4THnGn）
   └─ div  ms-7 flex gap-sm
       ├─ Button variant="secondary" shortcut="cmd+."      "Deny"（htvX+Z11l+）
       └─ （suppressAlwaysAllowRule 时不渲染）Xe(按键防误触包装) > Button variant="primary" shortcut="cmd+enter"  "Start guide"（UafjVnAajh）
```

应用行 `Hi`（memo 后 `Ui`，`ca31fdde5` 中 `function Hi`）——注意它和 Code 页 request_access 卡的应用行（`c96d752d0 GEe`，见 css-source §1.6）不是同一个组件：

```
div  p-2.5 [+ opacity-50 若未解析/未安装]
├─ div  flex items-center gap-sm
│   ├─ Wi 图标：有图 → div.size-5 shrink-0 overflow-hidden rounded-[4px] > img.size-full scale-[1.15]
│   │          无图 → div.size-5 shrink-0 rounded-[4px] bg-alpha-2（图标经 getAppIconForBundleId 异步取）
│   ├─ span  min-w-0 flex-1 truncate text-body text-secondary [unicode-bidi:isolate]   displayName ?? requestedName
│   └─ 已解析：alreadyGranted ? Badge variant="neutral" "Already allowed"（+mpYXoUDnZ）
│                            : Badge variant={read:"accent",click:"accent",full:"neutral"}[tier]
│                                    文案 View only（YrPQCpC/JN）/ Click only（SoaDca4p4O）/ All（zQvVDJ+j59）
│      未解析：span.shrink-0 text-footnote text-muted-as-secondary "(not installed)"（vg7ixeSm+z）
└─ 风险应用（isSentinel）：div  ms-7 mt-1 flex items-start gap-1.5 text-footnote text-danger
        ├─ Icon name="Warning" customSize=14 className="mt-0.5 shrink-0"
        └─ span  风险文案（shell / filesystem / system_settings，同 css-source §1.6 表）
```

#### 2.1.2 行为

- 键盘：`mt({enabled:!disableKeyboardShortcuts, cardRootRef, onCmdEnter, onCmdPeriod, …})`，⌘↵ = Start guide，⌘. = Deny。
- **没有剪贴板 / 系统键能力行**：同意时 `_cuGrants = {granted:[未授权且已解析的应用 {bundleId, displayName, grantedAt:Date.now(), tier:proposedTier}], denied:[未安装 {bundleId:requestedName, reason:"not_installed"}], flags: Ki}`，`Ki = {clipboardRead:false, clipboardWrite:false, systemKeyCombos:false}` 写死，决定为 `"always"`。工具描述也说 teach "no clipboard/system-key flags"。
- `suppressAlwaysAllowRule` 为真时不渲染主按钮，⌘↵ 也不生效（只能 Deny）。
- 主进程处理见「一」1.3：拒绝 → `teach_declined`；批准且有授权应用 → 抢全屏锁并 `onTeachModeActivated()`。
- 对话中的行文案（`shared-130@347700` 起的标签表）：`request_teach_access` running "Asking to guide you step by step" / done "Asked to guide you step by step"；`teach_step` "Showing a step" / "Showed a step"；`teach_batch` "Showing steps" / "Showed steps"。

---

### 2.2 teach：step schema 与执行语义（补充「一」1.3）

schema 原文位置 `BEf0UhNC@48300–53000`（`Fe()`），处理 `$r` / `ei` / `ti` / `ri` / `ii` 在 `BEf0UhNC@187300–195400`。

- `ei()` 校验：`explanation`、`next_preview` 必须是字符串（**允许空串**，提示层用 `.next-preview:empty{display:none}` 兜住）；`actions` 必须是数组（可空），每项 `action` 必须在 `Ji` 内：
  `key, type, mouse_move, left_click, left_click_drag, right_click, middle_click, double_click, triple_click, scroll, hold_key, screenshot, cursor_position, left_mouse_down, left_mouse_up, wait`（= `qi` 去掉 `zoom`）。
- `anchor` 若给出，必须是两个有限数；用 `R(x, y, coordinateMode, getDisplaySize(selectedDisplayId), lastScreenshot)` 换成**所选显示器的逻辑点**（与 display-scope 的 `left_click` 同一套换算）；换算失败就当作没给锚点（居中无箭头），不报错。
- `ti()` 执行一步：
  1. `onTeachStep({explanation, nextPreview, anchorLogical})` 显示提示框并**挂起等用户**；返回 `{action:"exit"}` → 收尾 `Er()`，整个工具返回 `{exited:true}`。
  2. 用户点 Next → `onTeachWorking()`（提示框切成 Working… 状态）。
  3. `actions` 为空 → 直接 `{kind:"ok", results:[]}`；`teach_step` 此时返回 `{executed:0, results:[]}`，**不带截图**。
  4. 授权需要先隐藏其他应用时（`grants.wantsHideBeforeAction && hideBeforeAction`）先 `prepareForAction(allowedApps, selectedDisplayId)`。
  5. 依次执行动作，选项强制 `{hideBeforeAction:false, pixelValidation:false, autoTargetDisplay:false}`；相邻动作间按 `Ki(当前, 上一个)` 等待；每个动作前查 `isAborted()`（用户中断 → 当作 exit）；动作抛异常转 `executor_threw`。任一动作 `isError` → 收尾并返回 `{executed, failed:{action, ok:false, output}, remaining}`。
  6. 全部成功 → 结果 + **一次新截图**（`ni()`：截图失败就只回 JSON）。
- `teach_batch`：先把每个 step 都过一遍 `ei()`（第 N 步写错，一个提示框都不出），再逐步 `ti()`；只要有任一步带动作，结尾截一次图；全部是纯讲解步则不截图。
- 模式生命周期（主进程 `muI2IV6k@6418700–6420900`，`EFa` 控制器）：
  - `teachModeChanged{active:true}` → 记下会话，提示层所在显示器 = 会话的 `cuSelectedDisplayId`，没有就取主窗口所在显示器（`screen.getDisplayMatching(mainWindow.getBounds())`）；`cuSelectedDisplayChanged`（模型 `switch_display`）时跟着移。
  - `teachStepRequested` → **隐藏主窗口**（`O8(main,true); main.hide()`，记 `t5=true`）→ 建 / 显示提示层 → 派发 show。
  - `teachNonTeachAction`（教学中模型调用了非 teach 的 CU 动作）→ 提示框淡出、**主窗口恢复**。
  - `teachModeChanged{active:false}`（含回合结束）→ 提示层淡出 320ms 后 `hide()`，主窗口恢复（`r5()`：`O8(main,false)`，不可见则 `show()`）。
  - 用户点 Exit → `resolveTeachStep({action:"exit"})`，再 `stopSession(锁持有者)`；没有持有者就当僵尸 overlay 清理。
  - `lifecycleChanged` 到非 running 而提示层还在 → 兜底收起并恢复主窗口。
  - 提示层创建失败 → 以 exit 结束当前 step、停会话、恢复主窗口。

---

### 2.3 teach：提示层（`cu-teach-${Date.now()}.html`）

源码：HTML 模板 `rFa()` `muI2IV6k@6400662–6416600`（整页内联 CSS + 脚本，`<title>Teaching</title>`），窗口 `hFa()` 紧随其后；preload `asar/.vite/build/computerUseTeach.js`（EIPC 接口 `claude.internal.computerUse.CuTeach`）。

#### 2.3.1 窗口

```
new BrowserWindow({ x,y,width,height = 目标显示器 workArea,
  transparent:true, frame:false, hasShadow:false, alwaysOnTop:true, skipTaskbar:true,
  focusable:false, acceptFirstMouse:true, movable:false, resizable:false, minimizable:false,
  maximizable:false, fullscreenable:false, type: darwin ? "panel" : undefined, show:false,
  backgroundColor:"#00000000",
  webPreferences:{ preload: computerUseTeach.js, sandbox:true, nodeIntegration:false, contextIsolation:true } })
.setAlwaysOnTop(true, "screen-saver")
.setFullScreenable(false)
.setIgnoreMouseEvents(true, {forward:true})      // 默认点击穿透，但转发 mousemove
uPr(win, onRestore)                               // 登记为"自家窗口"：代理动作期间穿透，动作后回调
darwin: setHiddenInMissionControl(true)
```

- 页面写到 `os.tmpdir()/cu-teach-<ts>.html` 再 `loadFile`，窗口关闭时删掉。
- 显示：`showInactive()`（不抢焦点），每次显示前 `setBounds(workArea)` 并重置穿透。
- 隐藏：派发 `hide`（CSS 淡出）→ 320ms（`iFa=320`）后 `win.hide()`。
- `uPr` 的回调：代理每个动作结束后把窗口重新设为穿透，并派发 `reassertHover`，让页面按当前 `:hover` 重新决定是否可点。
- 锚点坐标：主进程把显示器逻辑点减去 `workArea.{x,y}`（窗口原点）再派发，所以页面拿到的是窗口 CSS 坐标。

#### 2.3.2 markup

```html
<div class="tooltip" id="tooltip">
  <div class="arrow arrow-none" id="arrow"></div>
  <div class="step">
    <div class="logo-row"><svg class="logo" viewBox="0 0 248 248">…Claude 星芒 path，fill #D97757…</svg></div>
    <div class="explanation" id="explanation"></div>
    <div class="next-preview" id="next-preview"></div>
    <div class="buttons">
      <button class="btn btn-secondary" id="exit-btn">Exit</button>
      <button class="btn btn-primary" id="next-btn">Next</button>
    </div>
  </div>
  <div class="working">
    <svg class="spinner" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2"
         stroke-linecap="round" stroke-linejoin="round">
      <path d="M13.5 8C13.5 11.038 11.038 13.5 8 13.5C4.962 13.5 2.5 11.038 2.5 8C2.5 4.962 4.962 2.5 8 2.5"
            vector-effect="non-scaling-stroke"/></svg>
    <span class="working-label">Working…</span>
    <button class="btn btn-secondary" id="exit-btn-working">Exit</button>
  </div>
</div>
```

文案 Exit / Next / Working… 是硬编码英文。Logo path 是 `muI2IV6k` 中常量 `nFa`（248×248 的 Claude 星芒），spinner 是官方图标 `Spinner` 的 `master16` 路径（`tFa`）。

#### 2.3.3 CSS 要点（数值原样）

| 选择器 | 声明 |
|---|---|
| `*` | `margin:0; padding:0; box-sizing:border-box` |
| `html, body` | 全尺寸、`overflow:hidden`、`background:transparent`、`user-select:none`、`-webkit-font-smoothing:antialiased`、`text-rendering:optimizeLegibility`、`-webkit-app-region:no-drag`、`font-family:"Anthropic Sans", -apple-system, BlinkMacSystemFont, sans-serif` |
| `.tooltip` | `position:absolute; min-width:280px; max-width:420px; border-radius:16px; padding:18px 20px; box-shadow:0 10px 40px rgba(0,0,0,.25); background:linear-gradient(to bottom, rgba(255,255,255,1), rgba(245,245,250,.95))`；初始 `opacity:0; transform:scale(.94); transform-origin:var(--arrow-origin, center center)`；`transition: opacity/transform/left/top 300ms cubic-bezier(0.16,1,0.3,1)` |
| `.tooltip.visible` | `opacity:1; transform:scale(1)` |
| `.darkTheme .tooltip` | `background:linear-gradient(to bottom, rgba(64,63,62,.95), rgba(41,37,35,1))` |
| `.tooltip::before`（0.5px 发丝边） | `content:""; position:absolute; inset:0; border-radius:17px; pointer-events:none; border:.5px solid rgba(0,0,0,.2)`；暗色 `rgba(255,255,255,.2)` |
| `.arrow` | `position:absolute; width:0; height:0; border:10px solid transparent; filter: drop-shadow(0 0 1px rgba(0,0,0,.4)) drop-shadow(0 2px 4px rgba(0,0,0,.15))`；暗色 `drop-shadow(0 0 1px rgba(255,255,255,.25)) drop-shadow(0 2px 4px rgba(0,0,0,.3))` |
| `.arrow-none` | `display:none` |
| `.arrow-top`（提示框在锚点下方） | `top:-10px; left:var(--arrow-offset,50%); transform:translateX(-50%); border-top:none; border-bottom-color:rgba(255,255,255,1)`；暗色 `rgba(64,63,62,.95)` |
| `.arrow-bottom`（在上方） | `bottom:-10px; left:var(--arrow-offset,50%); transform:translateX(-50%); border-bottom:none; border-top-color:rgba(245,245,250,.95)`；暗色 `rgba(41,37,35,1)` |
| `.arrow-left`（在右侧） | `left:-10px; top:var(--arrow-offset,50%); transform:translateY(-50%); border-left:none; border-right-color:rgba(255,255,255,1)`；暗色 `rgba(64,63,62,.95)` |
| `.arrow-right`（在左侧） | `right:-10px; top:var(--arrow-offset,50%); transform:translateY(-50%); border-right:none; border-left-color:rgba(255,255,255,1)`；暗色同 left |
| `.step` | `display:flex; flex-direction:column; gap:10px` |
| `.logo-row` / `.logo` | `display:flex; align-items:center; gap:8px` / `width:18px; height:18px; flex-shrink:0` |
| `.explanation` | `font-size:14px; line-height:1.5; color:#29261b; white-space:pre-wrap; word-wrap:break-word`；暗色 `#f5f4ef` |
| `.next-preview` | `font-size:12px; line-height:1.4; color:#656358; border-top:.5px solid rgba(0,0,0,.1); margin-top:2px; padding-top:8px`；`:empty{display:none}`；暗色 `color:#b8b5a9; border-top-color:rgba(255,255,255,.1)` |
| `.buttons` | `display:flex; justify-content:flex-end; gap:8px; margin-top:4px` |
| `.btn` | `-webkit-app-region:no-drag; height:32px; padding:0 16px; border-radius:8px; font-size:13px; font-family:inherit; font-weight:500; cursor:pointer; border:none; transition: background 75ms ease-in-out, border-color 75ms ease-in-out` |
| `.btn-secondary` | `background:transparent; border:.5px solid rgba(0,0,0,.15); color:#3d3929`；hover `background:rgba(0,0,0,.05); border-color:rgba(0,0,0,.25)`；暗色 `border-color:rgba(255,255,255,.15); color:#e5e5e2`，hover `rgba(255,255,255,.06)` / `rgba(255,255,255,.25)` |
| `.btn-primary` | `background:#D97757; color:#fff`；hover `#c86a4a`；active `#b75e40` |
| `.btn:disabled` | `opacity:.5; cursor:default` |
| `.working` | `display:none; align-items:center; gap:10px`；`.tooltip.is-working .step{display:none}`、`.tooltip.is-working .working{display:flex}` |
| `.spinner` | `width:18px; height:18px; animation:spin .8s linear infinite; color:#656358; flex-shrink:0`；暗色 `#b8b5a9`；`@keyframes spin{to{transform:rotate(360deg)}}` |
| `.working-label` | `flex:1; font-size:14px; color:#656358`；暗色 `#b8b5a9` |

主题：`matchMedia("(prefers-color-scheme: dark)")` 决定 `body.className = "darkTheme" | ""`，并监听变化（跟随系统，不跟随应用内主题设置）。

#### 2.3.4 交互流程（页面脚本）

1. **穿透切换**：`.tooltip` 的 `mouseenter` → `cuTeach.mouseEnter()` → 主进程 `setIgnoreMouseEvents(false)`；`mouseleave` → `setIgnoreMouseEvents(true,{forward:true})`。`syncHover()` 用 `tooltip.matches(":hover")` 按当前指针位置重新决定（布局变了而光标没动时用）。
2. **show(data)**：去掉 `is-working`、启用 Next、填 `explanation` / `nextPreview`（`textContent`），**先 `place(anchor)` 再加 `.visible`**（首帧就在正确位置，不从 0,0 闪过来；后续步骤靠 left/top 过渡平滑移动），最后 `syncHover()`。
3. **place(anchor)**：常量 `ARROW_SIZE=10`、`ARROW_GAP=16`、`EDGE_MARGIN=20`；尺寸用 `offsetWidth/Height`（不受 scale(.94) 影响）。
   - 无锚点 → 居中、`arrow-none`、`--arrow-origin:center center`。
   - 有锚点 → 先把锚点夹到视口内（离边 20px），按 **下方 → 上方 → 右侧 → 左侧** 的顺序找放得下的一侧，都放不下用下方。
   - 上下放置：水平以锚点居中再夹边；箭头 `arrow-top/arrow-bottom`，箭头 x 夹到 `[16, w-16]`，`--arrow-offset` = 该 x，`--arrow-origin` = `x 0%`/`x 100%`。
   - 左右放置：垂直居中再夹边；`arrow-left/arrow-right`，同理设 y。
4. **Next**：按钮禁用 3s 后自动重新启用（`withRearm`，防点击穿透竞态丢点击），调用 `cuTeach.next()`；不在本地翻状态，等主进程派发 `working`。
5. **working**：加 `is-working`（显示 spinner + Working… + Exit），再 `syncHover()`（让 Exit 立即可点）。
6. **Exit**（两个 Exit 按钮同一处理）：两个按钮一起禁用 3s，`cuTeach.exit()`；真正收起由主进程 `hide` 事件完成。
7. **hide**：去掉 `.visible`（300ms 淡出 + 缩回 .94）。

---

### 2.4 watch-record：用户示范 → Claude 学（"Record a skill"）

源码：主进程 `muI2IV6k@6425700–6500000`（日志前缀 `[watch-record]`），选择器模板 `lIa()` `@6432150`、录制胶囊模板 `lRa()` `@6466100`、示范消息前言 `@6425755–6430500`；preload `computerUseWatchRecord.js`（`CuWatchRecordPill`）、`watchRecordChooser.js`（`CuWatchRecordChooser`）；渲染层入口 `shared-6`（`gz` 文案组）、`c752b32f8`（+ 菜单）、`shared-8`（麦克风菜单）；消息气泡 `cc1aae219`。

#### 2.4.1 入口与门控

| 入口（`entry_point`） | 位置 | 图标 / 文案 |
|---|---|---|
| `customize_skills_add` | Customize → Skills 的添加菜单 | `Recording` / "Record your screen"（UfRQgxACuM） |
| `plus_menu` | 输入框 + 菜单 | `Recording` / "Record a skill"（BTQ6AjqiI0） |
| `mic_menu` | 麦克风菜单，`purpose:"context"` | `Screenshare` / "Share screen"（把屏幕和讲解当作本条消息的上下文，不做技能） |

前置：需要开启 computer use（否则 "Turn on computer use in Settings, then try recording again."，QsRJi63y+g）；缺 TCC 时弹 "Grant macOS permissions"（ZoFao4NS9T）/ "To record your screen and actions, grant the macOS permissions below."（VR8FtozrWk）/ 按钮 "Continue to recording"（v7DYgSIHR1）/ "Close without granting permission"（zlYa5CM+bh）；远程会话不支持。org 级功能名 `cowork_watch_record`（admin 设置表里的显示名也是 "Record a skill"）。

#### 2.4.2 选择器窗口（`cu-watch-record-chooser`）

- 窗口宽 500、高 280（有麦克风 304），内容放不下时页面上报差额、最多长到 400；`show()+focus()`（会抢焦点）。主按钮有 300ms 输入保护（页面 `.actions:not(.armed) #record{opacity:.5; pointer-events:none}`，主进程同样拒收 300ms 内的选择）。
- 文案：标题 skill 模式 "Record a skill"，context 模式 "Share screen"；说明 skill 模式 "Your screen, clicks, typing, and voice are recorded, then sent to Claude and turned into a repeatable skill."（无麦克风时 "clicks and typing"）；context 模式 "…You review and trim the recording in the composer before it's sent to Claude."；警示 "Don't type passwords or secrets, or display sensitive information or private conversations while recording."；按钮 Cancel / "Start recording"（context："Start"）；麦克风分体按钮（开关 + 设备下拉，默认 "System default"），Esc = Cancel。
- 样式是自带 token（不是 cds）：亮 `--bg:#f9f9f7; --fg:#0b0b0b; --dim:#52514e; --border:rgba(11,11,11,.1); --hover:rgba(11,11,11,.05); --hover-strong:rgba(11,11,11,.1); --warn:rgba(217,119,6,.08); --warn-border:rgba(217,119,6,.25)`，暗 `#0b0b0b/#fff/#c3c2b7`、`rgba(255,255,255,.1/.1/.14)`、`rgba(245,158,11,.1/.25)`；`h1` 17px/600，正文 14px/1.55，按钮 13px/500、`padding:8px 16px; border-radius:8px`，主按钮 `background:var(--fg); color:var(--primary-fg)`。

#### 2.4.3 录制期间

- skill 模式下**主窗口隐藏**（context 模式不隐藏）；若此时没有 CU 锁持有者，在**光标所在显示器**上显示同一个 `cu-glow` 光晕，但**不放胶囊徽章**（`showBadge:false`）。
- 底部胶囊窗口：472×112（内含 32px 透明边距，胶囊本体 408×48），位于**主显示器** workArea 底部居中（`y = bottom - 48 - 32 - 24`），`type:"panel"`、`focusable:false`、`movable:true`（整条可拖，按钮 no-drag）、alwaysOnTop。
- 胶囊 markup：`.pill > .dot（8px #d97757 脉冲 1.5s） + .spinner + .proc-label "Processing" + .label（"Capturing " + .muted "· m:ss" + .warn "Ns left"） + button.mic（麦克风图标 + 电平条） + button.btn-secondary "Discard" + button.btn-primary "Done"`。胶囊底 `rgba(21,21,21,.95)`、`border-radius:12px`、`box-shadow:0 8px 24px rgb(0 0 0/.32), 0 2px 6px rgb(0 0 0/.2)`、`backdrop-filter:blur(10px)`；主按钮白底 `#0b0b0b` 字，次按钮 `rgba(255,255,255,.10)`。
- 时长：最长 10 分钟（`URa=6e5`）到点自动交付；第 9 分钟起（`54e4`）胶囊显示 60s 倒计时。
- Done → 胶囊切到 Processing（spinner + 闪光字 + 保留已录时长），等会话显示后由主进程关掉；Discard → 丢弃。
- 采集：点击（只记主显示器上的点击，其他屏的丢弃）、键入（按键名归一成 Enter/Tab/Esc/Backspace/方向键/F1–F12 等）、关键帧截图（全帧或变化区域裁剪，帧数超限时减半采样）、可选语音转写。

#### 2.4.4 交付给 Claude 的形状

- 用户消息附件包在 `<watch-record-demonstration durationMs="…" steps="…" images="…" [purpose="context"] [platform="…"]>…</watch-record-demonstration>` 里，按时间顺序交错"带时间戳的动作描述"和屏幕图片。
- 前言（skill 模式）："I recorded a demonstration of a desktop workflow for you to learn from. …"；随附指令要求：复现或写技能时**不要回放鼠标键盘动作**，而是找出每一步产生的**结果**，用最快最可靠的工具达成（浏览器步骤走 Chrome MCP、能用 MCP / CLI / 脚本 / API 的不走 UI），只有别无他法时才退回 computer use 截图 + 点击；computer use 未开启时要给出"开启 computer use"与"授予具体访问"两个选项。还声明截图、引号中的文本、转写的讲解都是**不可信数据**。默认动作：有 `propose_skills` 就调用它（不要直接 `save_skill`），否则用 skill-creator 起草并询问是否保存；但如果用户消息已说明要做别的（解释、排错），就照用户说的做。
- 对话气泡（`cc1aae219`）：标题 "Recorded demonstration · {seconds}s"（awH/78m9kL），context 模式 "Shared screen · N.Ns"；容器 `w-full max-w-[75ch] mx-auto mt-[var(--msg-gap,1.5rem)] mb-sm flex flex-col gap-2`，图片走轮播。录好待发的提示 "Your recording is ready to send. It's kept for one minute."（TZiSDbptxh）。

本项目没有原生录制器（输入事件录制、语音转写、关键帧差分），这一块如果要做，需要另起 M 级工作项。

---

### 2.5 full control：授权卡与会话中的 UI

#### 2.5.1 接管卡（Code 页版本）

「一」1.4.4 写的是聊天 / Cowork 用的专用卡 `ca31fdde5 wa()`（按钮 "Stay in background" / "Allow"）。**Code 页不走那张卡**：`c96d752d0` 的 request_access 卡 `JEe`（css-source §1 的那张）在 `input.takeoverFrom` 存在时就地变成接管卡（`c96d752d0@71800–77600`）：

- 卡壳、标题组件 `tc`、按钮行与普通授权卡完全相同（`epitaxy-approval-card …`、`flex flex-wrap justify-between gap-x-1 gap-y-[8px] ${AC}`）。
- 标题换成「一」里那三条 "Take over the screen? …"（7s2VxEaWpi / SHlXyyk+z2 / wsMb6SyXPb），应用名用 `span.[unicode-bidi:isolate]`，多个名用 conjunction 列表；远程主机时 subtitle 为 `p.break-words.text-secondary` "This session runs on {host} and is asking to use your computer."（7FCmr+u1Ps，`host` 包 `bdi dir=ltr`）。
- 接管时**不显示**能力行和应用行（`!c.takeoverFrom && U` 才渲染列表）。
- 按钮：左 secondary，正常为 "Deny"（快捷键 esc）；只有 `suppressAlwaysAllowRule && takeoverFrom` 时文案改为 "Stay in background"（gJXGKrdJQm），且此时不渲染主按钮。右 primary "Allow for this session"（gSU+cM2i4N，⌘↵）。
- 点允许时，接管请求**跳过**"后台模式介绍"弹窗（`if(c.takeoverFrom){g(e);return}`），普通授权才会先等那个弹窗。

#### 2.5.2 拿到全屏锁后（`cuLockChanged{holder}`）

全部由**独占锁**（`KW.exclusiveHolder`）驱动，app_* 的 app 锁不会触发这些：

| 部件 | 源码 | 行为 |
|---|---|---|
| 屏幕光晕 `cu-glow` | `muI2IV6k@≈4055500–4061100`（详见 css-source §5 与 glow 设计文档） | 显示器 = 持有者会话的 `cuSelectedDisplayId`，否则主窗口所在显示器；`switch_display` 时跟随；带胶囊徽章（6s 从中央飞到右上角）。释放时淡出后隐藏。 |
| 主窗口停靠 `cu-side-panel` | `NFa/PFa/FFa/IFa/LFa/RFa` `muI2IV6k@6423900–6425800` | 先退出全屏 / 取消最大化，记下原 bounds；缩成 **宽 min(520, 屏宽-20)、高 min(720, 屏高-20)**，贴在主窗口中心所在显示器 workArea 的**右上角**（右、上各留 20px）；mac 上 `setBounds(…, animate:true)`，其他平台 220ms 缓动；`setAlwaysOnTop(true,"floating")` + `setVisibleOnAllWorkspaces(true,{visibleOnFullScreen:true})`。同时派发 `CuDockStateChanged(true, holder)`。释放时 `app.focus({steal:true})`、还原 bounds / 最小尺寸 / 最大化 / 全屏，并派发 `CuDockStateChanged(false)`。 |
| 停靠条 | `c5f921d63 W`（css-source §3） | 由 `onCuDockStateChanged` 驱动：transcript 顶部 "Claude is using your computer" + secondary xs "Stop"。 |
| 系统通知 | `muI2IV6k@≈6396200`（`[cu-notifications]`） | 拿锁："Claude is using your computer. You can press Stop anytime."（tag `cu-lock-<session>`）；释放："Claude is done using your computer."，点通知回到会话。 |
| 全局 Esc 急停 | `ZNr/XNr/JNr/GNr/qNr` `muI2IV6k@≈4013500–4014700` | 持锁期间 `globalShortcut.register("Escape")`；按下即停**锁持有者和所有持 app 锁的会话**，并派发 `onCuEmergencyStop`。模型自己发 Esc 时先临时注销并吸收（`VNr` 计数），不会误停。 |

本项目现状对照：光晕和停靠条已有（挂在"任一 CU 步骤运行"上，见 glow 设计文档 §3），**主窗口停靠、拿锁/放锁通知、全局 Esc 急停都没有**。

---

### 2.6 PhantomCursor（原生幻影光标）

#### 2.6.1 JS 侧何时显示 / pulse / 隐藏

接口：`appScoped.setPhantomCursor(screenX, screenY, windowId?, pulse?)`、`appScoped.hidePhantomCursor(windowId)`（`computer_use.node` 导出；参数错误时报 "setPhantomCursor: expected (screenX, screenY, windowId?, pulse?)"）。JS 包装在 `muI2IV6k@≈4047000`。调用点只有两处：

1. **每个 app_* 动作之后**（`BEf0UhNC@≈147100`，app 动作结果处理）：结果带 `screenPt`（落点的**全局屏幕坐标**），且本会话确实持有该 `(bundleId, windowId)` 的 app 锁 → `setPhantomCursor(screenPt.x, screenPt.y, windowId, kind === "click")`。也就是**只有点击才 pulse**，键入 / 滚动 / 拖拽等只移动不 pulse；没有 `screenPt`（如纯菜单、失败未落点）就不动。
2. **app 锁变化**（`IPa()`，`[cu-app-indicator]`，`muI2IV6k@6393145`）：订阅 `cuAppLockChanged`——
   - 新拿到的窗口：`listWindows(bundleId)` 找到该窗口 bounds，`setPhantomCursor(x + w/2, y + h/2, windowId, false)`，即**拿锁就在窗口正中出现一个光标**，作为"这个窗口正被 Claude 后台控制"的指示。
   - 释放的窗口：`hidePhantomCursor(windowId)`。
   - 所有 app 锁都释放：取消所有待执行的动作（`PG.instance().cancelAll()`）。
   - 同时对每个被锁应用开 `collisionWatch(bundleId)`：用户自己激活了该应用时只记日志，**不释放锁**。

光标**按窗口一个**（键是 windowId），多个被锁窗口就有多个光标。全屏控制（display-scope）**不用**幻影光标：那时动的是用户的真光标。

#### 2.6.2 原生面板（`ComputerUseSwift.PhantomCursor`，`cu.node@0xab9c0–0xad620`）

ObjC 元数据：`_TtC16ComputerUseSwift13PhantomCursor` 只有一个 ivar `panel`（NSPanel）；实例存在以 windowId 为键的字典里。

| 项 | 值（反汇编原值） |
|---|---|
| 面板 | `NSPanel(contentRect: 0,0,56,56, styleMask: 0x80 = .nonactivatingPanel, backing: .buffered, defer: false)` |
| 外观 | `isOpaque=false`、`backgroundColor=.clear`、`hasShadow=false`、`ignoresMouseEvents=true`、`isReleasedWhenClosed=false` |
| collectionBehavior | `0x150` = `.stationary | .ignoresCycle | .fullScreenAuxiliary`（**没有** `.canJoinAllSpaces` / `.moveToActiveSpace`） |
| 内容 | layer-backed NSView 56×56，两层 CAShapeLayer（frame 56×56），同一条箭头路径：以面板中心 (28,28) 为尖端，点 `(0,0) (0,18) (4.5,14) (7.5,21.5) (11,20) (8,13) (14,13)` 闭合（y 向下，经 `28 - y` 翻转），即经典箭头指针，**尖端 = 面板中心 = 目标点** |
| 第 1 层（光晕） | fill / stroke 均 `clear`，`shadowColor = #D97757 α0.45`，`shadowOpacity 1`，`shadowRadius 10`，`shadowOffset 0` |
| 第 2 层（箭头） | `fillColor = #D97757`（sRGB 0.851/0.467/0.341），`strokeColor = #FAF9F5`（0.980/0.976/0.961），`lineWidth 3`，`lineJoin round`，`shadowColor = #D97757 α0.9`，`shadowRadius 4`，`shadowOffset 0` |
| 定位 | 输入是 CG 全局坐标（左上原点）；用 `NSScreen.screens[0]` 的高度换成 Cocoa 坐标，frame = `(x-28, H-y-28, 56, 56)`。所以**多显示器天然可用**（任何屏上的点都能放），不按显示器分面板 |
| 移动 | 面板不可见时直接 `setFrame` 跳过去；可见时在 `NSAnimationContext.runAnimationGroup` 里滑过去：`duration 0.18`、`allowsImplicitAnimation`、`CAMediaTimingFunction(0.2, 0, 0, 1)`、`animator().setFrame(_:display:true)`（另有一个比较前台应用 pid 的分支，语义未完全确认） |
| pulse | `contentView.layer.add(CABasicAnimation("transform.scale") from 1.0 to 1.25, duration 0.12, autoreverses, easeOut, forKey:"pulse")`，即约 240ms 放大回弹一次 |
| 窗口层级（关键） | 用 `CGWindowListCreateDescriptionFromArray` 查目标窗口的 `kCGWindowLayer` 与 `kCGWindowIsOnscreen`：**在屏** → `setLevel(目标窗口的 layer)`，必要时 `orderFrontRegardless`，再 `orderWindow(.above, relativeTo: targetWindowId)`——光标**紧贴在目标窗口之上**，被更前面的窗口正常遮挡，不是全局置顶；**不在屏**（最小化、隐藏、在别的 Space）→ `orderOut`；**没给 windowId** → `setLevel(3 = .floating)` + `orderFrontRegardless` |
| 重排 | 有一个遍历全部光标、对可见者重新做"取层级 + orderWindow(.above)"、找不到目标就 orderOut 的函数（`cu.node@0xac718`），经回调触发，调用方未直接定位 |
| 隐藏 | `hidePhantomCursor(windowId)` → 该面板 `orderOut`；另有全部隐藏的路径 |

Space / 全屏应用：没有 `.canJoinAllSpaces`，面板跟随它被 order 时的 Space；因为总是相对目标窗口排序、目标不在屏就收起，所以**目标窗口在哪个 Space 光标就在哪**，切走就消失。`.fullScreenAuxiliary` 让它能出现在全屏应用的 Space 里（盖在全屏窗口上）。`.stationary` 让 Mission Control 时不随窗口飞走、`.ignoresCycle` 不进 ⌘\` 窗口循环。

同一 `.node` 里还有 `WindowCover`（`showCoverForWindow` / `appScopedShowCover`：用窗口截图做一张不透明、带阴影、同为 `0x150` 行为的 NSPanel 盖在窗口上），**JS 侧没有任何调用**，2.42304.0 未启用。

#### 2.6.3 "高亮"是怎么定位到目标窗口的

官方**没有**目标窗口描边 / 遮罩式高亮：

- **全屏控制**：高亮是整块显示器的光晕（`cu-glow`），定位单位是显示器（持有者的 `cuSelectedDisplayId` → 否则主窗口所在屏），与具体窗口无关。
- **后台 app_* 控制**：唯一贴着目标窗口的视觉是幻影光标——拿锁时出现在窗口中心，之后跟着每个动作的落点移动；它靠原生 `orderWindow(.above, relativeTo: windowId)` + 取目标窗口 layer 来"粘"在目标窗口上方，目标不在屏就收起。
- **teach**：提示框箭头指向模型给的 `anchor`（全屏截图坐标换成显示器逻辑点），提示层铺满所选显示器的 workArea。
- 活动面板 / rail 实时卡里的"预览帧"只是截图，不是屏幕上的高亮。

本项目现状（代码地图 §16-6）：假光标是 Web 近似、只在 appClick 后出现；overlay 高亮是预览高亮。要对齐官方：假光标改为原生 NSPanel（参数照上表），并在 app 锁获得 / 释放时显示 / 隐藏；"目标窗口高亮"按官方就是不做，用光标代替。**需要用户决定**：是否接受"官方没有窗口高亮，删掉我们的预览高亮、只留光标"。

---

### 2.7 剪贴板授权在卡片上的呈现

- **Code 页 request_access 卡**（`c96d752d0 JEe`，css-source §1.5）：能力行在应用行之前，`flex flex-col gap-0.75` 列表中的 `TT` 行 `flex items-center gap-sm rounded-[5px] px-md py-md bg-alpha-1`：
  - `clipboardRead` → 图标 `Clipboard`，"Read your clipboard"（PQoBWCb1C7）
  - `clipboardWrite` → 图标 `Copy`，"Write to your clipboard"（TFF5TqdaAt）
  - `systemKeyCombos` → 图标 `Keyboard`，mac "Use system shortcuts (⌘Q, ⌘Tab, and similar)"（PDHlS6OqUX）
  纯文本行，**没有复选框 / 开关**；整卡 "Allow for this session" 一并授予：`flags = {clipboardRead: requestedFlags.clipboardRead ?? false, clipboardWrite: …, systemKeyCombos: …}`，`userConsented:true`。
- 只有尚未授予的 flag 进 `requestedFlags`（「一」1.5.1），所以已授过的剪贴板权限不会重复出现。有 flag 时标题用 "Allow Claude to use these capabilities?"（zAJRXPKbOG）。
- 工具 schema 的说法与 UI 不一致：`request_access.clipboardRead` 描述写 "separate checkbox in the dialog"，但两张卡都没有复选框。以 UI 为准。
- `clipboardWrite` 描述写明授予后 "multi-line `type` calls use the clipboard fast path"（快速路径条件见「一」1.5.3）。
- teach 授权卡不出现剪贴板行（flags 固定 false）；接管卡也不显示能力行。
- 对话中的行文案：read_clipboard "Reading clipboard"（KFvkLQx8VH），write_clipboard "Copying to clipboard"（baoihVozjs），行图标 `Clipboard`（css-source §2.2）。
- 运行时拒绝（`BEf0UhNC@≈210500–211900`）：未授 flag → `grant_flag_required` "Clipboard {read|write} is not granted. Request `clipboardRead|clipboardWrite` via request_access."；持有任何 app 锁 → `state_conflict`（后台工作时用户在用剪贴板，要先 app_release 再走 display-scope）；`clipboardGuard` 开启且前台是 click 级应用时，`write_clipboard` 被拒、`read_clipboard` 前会把剪贴板暂存并清空（`ot()` 的 stash / restore）。

---

### 2.8 需要用户决定（汇总）

1. teach 三件套（Claude 引导用户）与 watch-record（用户示范给 Claude）做哪一个、还是都做（§2.0）。两者官方都没有设置页入口。
2. teach 依赖 display-scope 坐标与动作；display-scope 工具面未落地前，teach 只能做 UI 外壳。
3. 官方没有目标窗口高亮，是否删掉本地预览高亮、改由原生幻影光标承担（§2.6.3）。
4. 是否补齐全屏锁的其余三件：主窗口停靠右上角、拿锁 / 放锁系统通知、全局 Esc 急停（§2.5.2）。
5. teach 提示层、录制胶囊的文案在官方是硬编码英文；本项目回复规则要求中文界面时，是照搬英文还是本地化（官方无对应物，只能本地加 i18n）。

### 2.9 未找到 / 未确认

- Code 页对 `computer:request_teach_access` 用哪张卡渲染（只在 `ca31fdde5` 找到 `Wa`）。
- 幻影光标重排函数 `cu.node@0xac718` 的触发源；可见状态下"前台 pid 比较"分支的确切语义。
- watch-record 的帧数 / 图片上限、关键帧差分算法、转写服务细节：只看了入口、窗口与交付格式，未逐项展开。
