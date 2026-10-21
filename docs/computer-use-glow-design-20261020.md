# Computer Use 屏幕光晕 overlay：设计稿

> **状态（2026-10-20）**：用户选定 §3 **方案 B**，已实现：`electron/computer-use/in-use.cjs`（占用信号）、`glow.cjs`（控制器）、
> `glow-page.cjs`（官方页面逐字）、`actions.mjs`（主进程与渲染层共用的 CU 条目识别）；停靠条改用同一信号（`main.cjs` 事件
> `computer-use-in-use`，`desktop:call computer-use:in-use`）；`grants.cjs` 拒绝本应用自己的 bundle id。§4.4（应用级减少动态：运行时注入页面
> 自己的 reduced-motion 规则，页面本身仍逐字）与 §4.5（显示器移除或尺寸变化时跟随，原显示器没了就回主显示器）已于同日获批并实现。测试：`tests/computer-use-glow.test.mjs`、`scripts/computer-use-ui-test.mjs`。

> **更新（2026-10-21，目标窗口高亮一步）**：全屏控制锁已有（`full-control.cjs`），光晕改回官方的触发方式——只跟显示锁持有者
> （§3 A）：`main.cjs computerUseSyncGlow()` 在持有者"在用"时显示、否则隐藏；拿锁 / 放锁时也同步一次。后台 app_* 工作不再亮整屏光晕，
> 改为**目标窗口高亮**（`electron/computer-use/window-highlight.cjs` + 原生 `WindowHighlight.swift`）：同一组 `#glow` 三层 inset
> 阴影与 2s 脉动，画在当前操作窗口的 frame 上，面板按官方幻影光标的方式叠在目标窗口正上方（官方没有窗口高亮，见
> official-spec §2.6.3；取舍记录在进度日志）。停靠条仍用 in-use（§3 B）。

依据：`docs/computer-use-ui-css-source-20261020.md` §5，加上本轮在官方主进程 chunk
`reference/installed-2.42304.0-20261017/asar/.vite/build/index.chunk-muI2IV6k.js` 里补读的显示/隐藏逻辑（字节偏移记为 `@N`）。
下文为实现前的设计；§6 的第 1 问已定为 B。

## 1. 官方行为（2.42304.0 原样）

### 1.1 触发：只跟全屏控制锁走

`gIr`（@≈4060900）订阅锁 `KW` 的 `cuLockChanged`：

- `holder` 非空时：先取持有者选定的显示器；没有选定就用主窗口所在显示器（`screen.getDisplayMatching(mainWindow.getBounds()).id`）。
  然后 `dIr(displayId)` 记下显示器，`pIr()` 显示光晕。
- `holder` 为空时：`mIr()` 隐藏光晕。
- 持有者中途换显示器（`switch_display`）时走 `hIr(holder, displayId)`：只有当前持有者能移动光晕，窗口直接 `setBounds` 到新显示器。

所以光晕和渲染层的停靠条（`onCuDockStateChanged`）是同一个信号：**锁在就亮，跟单个步骤无关**。步骤之间不闪。

### 1.2 显示 `pIr({label?, showBadge?})`

1. 取消挂起的隐藏计时器；代号 `cIr` 自增，后发的显示/隐藏会作废先前还没完成的那次。
2. `HG(true)`：通知订阅者（`sIr` 注册，内部状态 `iIr`）光晕已亮。
3. 惰性创建窗口（`fIr`）：页面 HTML（常量 `tIr`）写到 `tmpdir/cu-glow.html` 后 `loadFile`；加载失败就销毁窗口，并且不留半成品。
4. `setBounds(所选显示器.bounds)`，不可见时 `showInactive()`。
5. `executeJavaScript`：写入胶囊文字（默认 `eIr` = “Claude is using your computer”），去掉 `flash` 后用 `void badge.offsetWidth` 强制重排，
   再加回 `flash`（`showBadge` 为 false 时不加），最后把 `#overlay` 的 opacity 设为 1。
6. 日志 `[cu-glow] shown bounds=…`；失败时记 `[cu-glow] showGlow failed`，不抛给锁。

### 1.3 隐藏 `mIr()`

代号自增。没有窗口就直接 `HG(false)`；有窗口就先把 `#overlay` 的 opacity 设为 0（页面里有 `.3s` 过渡），
等 **`$Fr` = 320ms** 后 `hide()`，再 `HG(false)`。窗口不销毁，下次复用。

### 1.4 窗口与页面

窗口参数、`setAlwaysOnTop(true,"screen-saver")`、`setIgnoreMouseEvents(true)`、从自家命中测试排除、`setHiddenInMissionControl(true)`，
以及页面的 `#glow`、`#badge`、`#badge.flash`、`#badge-dot` 和 reduced-motion 规则，都见 CSS 分析 §5，这里不重复。

## 2. 本地落点

| 部件 | 位置 | 说明 |
|---|---|---|
| 控制器 | 新建 `electron/computer-use/glow.cjs` | `createGlow({BrowserWindow, screen, fs, tmpdir, log})` → `{show({displayId, label}), hide(), moveTo(displayId), onChange(fn), dispose()}`，代号、320ms 隐藏、惰性建窗与官方一一对应 |
| 页面 | 新建 `electron/computer-use/glow-page.cjs` | 导出官方 `tIr` 字符串原样（照“全部照官方”规则；不改色、不改时长），只把胶囊文字留成运行时注入 |
| 接线 | `electron/main.cjs`（`computerUse` 创建处，:395） | 订阅 §3 的“占用”信号，调用 `show` / `hide`；`app.on("before-quit")` 时 `dispose()` |
| 文案 | 胶囊文字用本地停靠条同一条：`{name} is using your computer`（zh-CN 已有：`{name} 正在使用你的电脑`，`session.mjs:791`） | 名字是当前核心名，与停靠条一致 |

## 3. 触发信号（本地没有锁，需要决定）

本地现在没有全屏控制锁：工具都是 app 级的（`app_*`），停靠条也只是“任一 CU 步骤运行时”显示（`main.jsx:6806`）。直接照搬
这个规则给光晕，会在每两步之间熄灭再点亮（320ms 淡出加 6s 胶囊动画会反复触发），这和官方“锁在就亮”的观感不同。

可选方案：

- **A. 等锁**：光晕和停靠条一起改挂到将来的 `request_full_control` / `release_full_control` 锁上（官方工具表已有这两项：
  `shared-130` 的 `mcp__computer-use__request_full_control` / `release_full_control`）。最忠实，但要先做锁。
- **B. 会话级占用**：主进程按会话记“本轮 turn 里调用过 CU 工具且 turn 仍在跑”，turn 结束、Stop、会话关闭时释放。光晕和停靠条
  都改用这个信号。不闪，但“占用”的定义是本地的，官方没有。
- **C. 照搬当前停靠条规则**：最省事，但会闪，不建议。

推荐 **A**；如果锁不在近期计划里，就先用 B 作过渡，并在代码里注明它对应官方的哪把锁。

## 4. 与现有子系统的交点

1. **截图排除**：本地 SCContentFilter 只包含已授权应用（`Capture.swift:111`），本应用不在授权表里时 overlay 天然不进截图。
   但 `grants.cjs` 目前没有显式拒绝本应用自己的 bundle id，需要补一条：本应用永远不能被授权，并配一个测试。
2. **输入**：overlay 设了 `setIgnoreMouseEvents(true)` 和 `focusable:false`，raw 层发的 CGEvent 会穿透。AX 层按应用元素取点，
   不受影响。需要核对 `WindowList.swift` 的窗口枚举：layer 不为 0 的窗口会被记为 `isAuxiliary`，要确认 overlay（screen-saver 层）
   不会被当成“遮挡目标窗口”而导致拒绝点击。真正的点击和遮挡判断以 native 端为准，实现时加一条 live 测试。
3. **前台检查**：`showInactive` 不抢焦点，前台应用检查（`guards.cjs`）不受影响。
4. **减少动态**：页面只认 `prefers-reduced-motion`。本地还有应用级的 `data-reduce-motion` 设置（停靠条用 `motion-safe:`），
   光晕页拿不到。建议在 §1.2 第 5 步注入时，如果应用设置开了，就在 `<html>` 上加 `data-reduce-motion="true"`，同时给页面补一条
   对应选择器。这是对官方页面唯一的增补，需要确认。
5. **多显示器**：B 方案下没有“持有者选定的显示器”，就用主窗口所在显示器；显示器拔插（`screen` 的 `display-removed`）时
   重新 `setBounds`，显示器不存在了就回到主显示器。官方在这一点上没有处理，属于本地补全，需要确认。

## 5. 测试计划

- 单元：`tests/computer-use-glow.test.mjs`，用假的 BrowserWindow/screen 测这几件事：show 后再 show 只建一次窗口；hide 在 320ms 后才
  `hide()`；hide 之后 300ms 内再 show 会取消隐藏；代号能作废过期的显示；页面加载失败会销毁窗口并让 `onChange(false)` 生效；
  bounds 跟着 displayId 走。
- 页面：断言 `glow-page.cjs` 与官方 `tIr` 逐字相同（从 reference 读取后比较），防止有人顺手改样式。
- 授权：本应用的 bundle id 被 `grants.cjs` 拒绝。
- UI：`scripts/computer-use-ui-test.mjs` 增加一步，fixture 触发占用信号后，断言主进程有一个可见、忽略鼠标、alwaysOnTop 层级为
  screen-saver 的透明窗口；释放后 320ms 内它被隐藏。

## 6. 待用户拍板

1. 触发信号用 A、B 还是 C（§3）。
2. 是否接受 §4.4 的 `data-reduce-motion` 增补。
3. 是否接受 §4.5 的显示器拔插处理。
