# Computer Use 界面：官方样式分析（只读，不含实现）

参考固定为 Claude Desktop **2.42304.0**（`reference/installed-2.42304.0-20261017`）。本文只读源码：渲染层 chunk 用 `scripts/analyze-code-snapshot.mjs`（baseline 2.37337.1）及同一套 prettier/babel 格式化后阅读；主进程 chunk 直接在压缩源中定位（`index.chunk-muI2IV6k.js` 只有 14 行，位置记为字节偏移 `@N`）。类名对应的声明与 token 取自本项目 `index.html` 已加载的官方样式表（`public/assets/v1/c6a992d55-sXiDGMFQ.css`、`public/assets/current-chat/layout.css` 等）。没有修改任何文件，没有运行官方代码。

## 0. 总体结论

- **官方 CU 界面没有专属 CSS 文件。** 渲染层全部用 cds/Tailwind 工具类拼装；唯一手写的 CSS 是主进程写到 `tmpdir/cu-glow.html` 的屏幕光晕页（§5）。
- **本项目已经加载了同一套工具类。** 授权卡、停靠条、实时卡用到的类，在 `c6a992d55-*.css` / `layout.css` 中都有原样声明（逐项核对见各节）。实现时可以直接写官方类名，独立 CSS 只需承载本地扩展（标记、我们自己的横幅）。
- **品牌色是 clay，不是 accent。** 官方 CU 的强调色一律走 `--cds-fill-brand` → `--cds-clay-emphasized` = `#c6613f`；光晕页用硬编码 `rgb(217,119,87)`。我们现有 `source-computer-use.css` 用的是 `--cds-fill-accent`。
- **官方没有截图标记。** 渲染层唯一的标记是 Chrome 点击用的 6px 圆点，CU 调用永远不传坐标。我们的圆环/拖拽线/滚动方框是本地自创；2026-10-20 用户裁定“全部照官方设计”后，应改为官方缩略图并去掉标记。

## 1. request_access 授权卡

源码：`readable/c96d752d0-BOCqU7c2.js` `JEe`（卡体，约 4888–5355）、`GEe`（应用行，4827）、`ZEe`（标题，5383）、`TT`（能力行，5423）、`WEe`（层级文案，4814）、`UEe`（风险文案，4798）；风险分类 `fmt/ca31fdde5-DsaTHDpW.js` `Pi`（2097）。卡壳与其他审批卡共用：`readable/c12c146ad-CuJdg7K3.js` 常量 `P`（145）。

### 1.1 卡壳（与所有审批卡相同）

`epitaxy-approval-card relative isolate flex flex-col rounded-card p-[12px] gap-[12px] max-h-[60vh] origin-top @container animate-code-approval-promote …`，card 形态再加 `epitaxy-card-outline`。

| 类 | 声明（官方样式表） | token 取值 |
|---|---|---|
| `rounded-card` | `border-radius: calc(var(--cds-radius) + calc(.25rem * var(--cds-rem-scale,1)))` | `--cds-radius` 随上下文 .25rem / .375rem×scale / .5rem×scale |
| `p-[12px]` / `gap-[12px]` | `padding:12px` / `gap:12px` | — |
| `max-h-[60vh]` | `max-height:60vh`（低位再加 `max-h-[min(60vh,calc(22.5rem*var(--cds-rem-scale,1)))]`） | — |
| `epitaxy-card-outline` | `--epitaxy-card-outline: 0 0 0 1px var(--cds-border); box-shadow: var(--epitaxy-card-outline)`（`c6a992d55-*.css`，与若干 diff 选择器同组） | 本地 `source-approval-card.css:9` 已有等价的 `box-shadow: 0 0 0 1px var(--cds-border)` |

结论：授权卡应直接复用现有审批卡壳（`SourceApprovalCardView` 的 `sac-card`），不另做弹层。

### 1.2 标题（`ZEe`）

| 条件 | 文案（en-US） |
|---|---|
| 1 个应用、无能力项 | `Allow Claude to <b>use</b> <meta>{app}</meta>?`（`dXCzkuzvh2`） |
| 多个应用、无能力项 | `Allow Claude to <b>use</b> {count} apps?`（`dTGOltnc/b`） |
| 有应用或能力项 | `Allow Claude to <b>use</b> these capabilities?`（`zAJRXPKbOG`） |
| 都没有 | `Allow Claude to <b>use your computer</b>?`（`6WGtjNPGER`） |

`<b>` 与 `<meta>` 都渲染为 `span.text-primary`（`wT`）；应用名外包 `[unicode-bidi:isolate]`。即标题主体为次级色，只有动词和应用名为主色。与现有审批卡的 `sac-em` 结构一致。

### 1.3 Reason

放在卡头 subtitle 中，组件 `kC`，accessible label 为 `Reason`（`AkCxS/TH0/`），类：`max-h-[calc(3*var(--cds-leading-body))] overflow-y-auto scroll-fade-size-[8px]`，即 3 行正文高度（`--cds-leading-body` = 1.1875rem×scale，comfortable 1.25rem）后滚动并有 8px 渐隐。现有 `sac-reason` 已是同一结构，可直接复用。

### 1.4 列表容器

`flex flex-col gap-0.75` → `gap: calc(var(--spacing) * .75)` = **3px**（`--spacing` = .25rem）。顺序固定：**能力行在前，应用行在后**。

### 1.5 能力行（`TT`）

`flex items-center gap-sm rounded-[5px] px-md py-md bg-alpha-1`，图标 `size:"md"` + `text-muted-as-secondary shrink-0`，文字 `text-body text-primary flex-1`。

| 能力 | 图标 | 文案 |
|---|---|---|
| clipboardRead | `Clipboard` | Read your clipboard（`PQoBWCb1C7`） |
| clipboardWrite | `Copy` | Write to your clipboard（`TFF5TqdaAt`） |
| systemKeyCombos | `Keyboard` | Use system shortcuts (⌘Q, ⌘Tab, and similar)（`PDHlS6OqUX`，非 mac 用 `zCFqyz7RGK`） |

纯文本行，没有开关；授权是整体同意。

### 1.6 应用行（`GEe`）

```
div  flex items-center gap-sm rounded-[5px] px-md py-md bg-alpha-1 [+ opacity-50 若未安装]
├─ img  size-[20px] rounded-[4px] shrink-0 scale-[1.15]      （无图标时：div size-[20px] rounded-[4px] bg-alpha-2 shrink-0）
├─ div  flex flex-col gap-0.5 min-w-0 flex-1
│   ├─ div  text-body text-primary truncate [unicode-bidi:isolate]   名称 [+ span.text-muted-as-secondary " (not installed)"]
│   └─ div  text-footnote text-warning                               风险说明（仅风险应用）
└─ span text-footnote text-muted-as-secondary shrink-0               层级文字（仅已安装）
```

| 类 | 声明 | token |
|---|---|---|
| `gap-sm` | `gap: var(--cds-gap-sm)` | .5rem×scale（comfortable .75rem） |
| `px-md` / `py-md` | `padding-inline/block: var(--cds-pad-md)` | .5rem×scale |
| `bg-alpha-1` | `background-color: var(--cds-alpha-1)` | `hsl(from var(--cds-neutral-900) h s l / 5%)` |
| `bg-alpha-2` | `var(--cds-alpha-2)` | 同上 10% |
| `rounded-[5px]` / `rounded-[4px]` | 5px / 4px | — |
| `size-[20px]` + `scale-[1.15]` | 20×20，`scale:1.15`（图标视觉约 23px，不占额外布局） | — |
| `opacity-50` | `.5` | — |
| `text-body` | `font-size: var(--cds-font-size-body)`，行高 `--cds-leading-body` | .8125rem / 1.1875rem（×scale） |
| `text-footnote` | `--cds-font-size-footnote` / `--cds-leading-footnote` | .75rem / .9375rem |
| `text-muted-as-secondary` | `color: var(--muted-as-secondary, var(--cds-text-muted))` | `--cds-text-muted` → neutral-400（仅在 `c6a992d55-*.css`，`layout.css` 无，但 index.html 已加载） |
| `text-warning` | `var(--cds-text-warning)` | 亮色 warning-600，暗色 warning-300 |
| `gap-0.5` | 2px | — |

排序与过滤：`alreadyGranted` 的应用不显示；风险应用（`isSentinel`）置顶。

**层级文字**（`WEe`）：`read` → **View only**（`YrPQCpC/JN`），`click` → **Click only**（`SoaDca4p4O`），`full` → **All**（`zQvVDJ+j59`）。当前卡是纯文本，不是徽章；旧卡 `ca31fdde5 Hi` 才用徽章（read/click 为 accent、full 为 neutral，另有 “Already allowed”）。

**风险分类**（`Pi`，macOS 部分原样）：

| 类别 | 文案 | bundle id |
|---|---|---|
| shell | Can run commands on your computer（`mRg/83TFli`） | com.apple.Terminal, com.googlecode.iterm2, com.microsoft.VSCode, dev.warp.Warp-Stable, com.github.wez.wezterm, org.alacritty, io.alacritty, net.kovidgoyal.kitty, co.zeit.hyper, com.mitchellh.ghostty, com.todesktop.230313mzl4w4u92, com.vscodium, com.exafunction.windsurf, dev.zed.Zed, org.tabby, com.jetbrains.intellij, com.jetbrains.pycharm, com.raphaelamorim.rio, org.contourterminal.Contour, com.neovide.neovide |
| filesystem | Can open, change, or delete any file, and run apps and scripts（`UqvInOhgC/`） | com.apple.finder |
| system_settings | Can change system settings（`yjV52Y2G/h`） | com.apple.systempreferences |

注意这张表与本项目 `grants.cjs` 的层级表不同：层级决定能做什么（read/click/full），风险分类只决定是否显示警告行。

### 1.7 按钮行

`flex flex-wrap justify-between gap-x-1 gap-y-[8px]` + `AC`（≤420px 容器时改为纵向拉伸）。左 **Deny**（`htvX+Z11l+`，secondary，快捷键 Esc），右 **Allow for this session**（`gSU+cM2i4N`，primary，⌘↵）。没有 Allow once / Always，没有逐应用开关。`gap-x-1` = 4px，`gap-y-[8px]` = 8px。

## 2. 对话中的工具行

源码：Code 页标签表 `fmt/shared-130-DnUXVlYq.js` 18579–18880（running/done 两套英文）；聊天渲染器缩略图 `ion-dist/assets/v1/cc1aae219-*.js` 的 `NH`，图标表 `RW`、图标绘制 `zW`。

### 2.1 截图缩略图（`NH`）

| 部件 | 类 | 解析 |
|---|---|---|
| 按钮 | `relative flex-shrink-0 w-9 h-7 rounded border border-border-300 hover:border-border-200 hover:rotate-2 transition-[border-color,box-shadow,rotate,transform,outline-color] duration-150 ease-out hover:shadow-sm overflow-hidden` | **36×28px**；边框 `--cds-border`（= alpha-2），悬停 `--cds-border-strong`、旋转 2°、`--cds-shadow-sm` |
| 图片 | `w-full h-full object-cover`，`loading:lazy` | 裁切填满 |
| 点击点 | `absolute pointer-events-none rounded-full border border-brand-100 w-1.5 h-1.5 bg-brand-100`，`translate(-50%,-50%)` | **6px** 实心点，按 `min(w/naturalW, h/naturalH)` 缩放定位；**只有 Chrome 的 `computer` 工具会触发，CU 从不触发** |

title：Click to view full screenshot（`LWiiXht89U`）；alt：Screenshot thumbnail（`/oSRHC9/hb`）。

### 2.2 行图标（`RW` → `zW`，16px，`text-muted-as-secondary`）

| 官方图标名 | 用于 |
|---|---|
| Camera | screenshot |
| Cursor | 各类点击 |
| Keyboard | type / key |
| Timer | wait |
| ArrowUp / ArrowDown / ArrowLeft / ArrowRight | scroll（左右强制 `dir="ltr"`） |
| Reorder | drag |
| SearchCircle | zoom |
| Computer | mouse_move、未知动作 |
| Menu | app_menu |
| Clipboard | 剪贴板工具 / 授权卡能力行 |
| Batch | 批量 |
| Eye / Search | 其他 |

以上名称在本项目 `src/generated/icons.json`（`Icon` 组件使用的官方图标字体字形表，371 个）中**全部存在**，可直接按名引用。

## 3. 停靠条（全屏控制期间）

源码：`fmt/c5f921d63-DlNsH1G_.js` `W`（234–295），由 `onCuDockStateChanged` 驱动（仅全屏锁持有时显示，与单个步骤无关）。

```
div  flex items-center gap-2 border-b border-accent-brand/20 bg-surface-1 px-4 py-2
     + 有桌面边框：absolute inset-x-0 z-[15] draggable-none top-[calc(var(--frame-row-h,3rem)+var(--organization-banner-below-header-height,0px))]
     + 否则：relative shrink-0
├─ div   pointer-events-none absolute inset-0 bg-accent-brand/15      （品牌色 15% 底）
├─ span  relative h-2 w-2 shrink-0 motion-safe:animate-pulse rounded-full bg-fill-brand   （8px 脉冲点）
├─ span  role=status  relative text-sm font-semibold text-clay-emphasized   "Claude is using your computer"
└─ span  relative ms-auto flex items-center gap-1   → Button secondary xs "Stop"（data-testid cu-docked-stop）
```

| 类 | 解析 |
|---|---|
| `border-accent-brand/20` | `color-mix(in oklab, var(--cds-fill-brand) 20%, transparent)` |
| `bg-accent-brand/15` | 同上 15% |
| `bg-fill-brand` / `text-clay-emphasized` | `--cds-fill-brand` → `--cds-clay-emphasized` = **#c6613f** |
| `motion-safe:animate-pulse` | `pulse 2s cubic-bezier(.4,0,.6,1) infinite`，`[data-reduce-motion=true]` 下不生效 |
| `text-sm` / `font-semibold` | .875rem，行高 1.25/.875；字重 580 |
| `px-4 py-2 gap-2` | 16px / 8px / 8px |
| `bg-surface-1` | 亮 `--cds-gray-10` #fcfcfb，暗 `--cds-gray-850` #151515 |

位置在**对话区顶部**（transcript 之上），不是输入框之上；不显示当前动作、应用名或截图。

## 4. 活动面板实时卡

源码：`readable/c21f11e6d-Bd0v2A97.js` `P_`（2161–2215），外壳 `fmt/c5f921d63-DlNsH1G_.js`（导出 `a`，约 128–203）。

| 部件 | 类 / 值 |
|---|---|
| 标题 | Computer use（`RfG2KsHAez`），副标题 `text-muted-as-secondary font-normal`，前缀 “ · ” |
| 帧图 | `w-full h-auto max-h-72 object-contain`（最高 **18rem**），不可拖拽 |
| 帧外框 | 非 flat：`block w-full overflow-hidden rounded-md border-0.5 bg-surface-3`（圆角 `--radius-md` .375rem，0.5px 边，surface-3 亮 gray-0 / 暗 gray-800）；flat：`… rounded-md border-0.5 my-1.5` |
| 可点击时 | 外框为 button，`focus-visible:outline-none focus-visible:ring-2` |
| 说明行 | `truncate` + flat：`py-1.5 text-caption text-muted-as-secondary`（caption .6875rem）；非 flat：`text-secondary font-small mt-1.5` |
| 说明内容 | `inline-flex items-center gap-1.5`：Live 徽章（success、xs，`Dn82ALx/+V`）+ Full control · {target} / Background · {target} |
| 空态 | Claude is working on your computer. You’ll see updates here as Claude makes progress.（`sdEtD4lCcu`），容器 `px-3 py-6 text-start` |
| 刷新 | 默认 1 fps（flag `cowork_activity_panel_live_preview`），主进程按 `max(500, 1000/fps)` ms 取帧 |

## 5. 屏幕光晕 overlay（主进程）

源码：`asar/.vite/build/index.chunk-muI2IV6k.js` `@4055503–4061100`，日志标签 `[cu-glow]`。不是原生面板，是透明 Electron 窗口加载内联 HTML。

**窗口参数**：`transparent, frame:false, roundedCorners:false, hasShadow:false, alwaysOnTop, skipTaskbar, focusable:false, movable/resizable/minimizable/maximizable/fullscreenable:false, type:"panel"(mac), enableLargerThanScreen, show:false, backgroundColor:"#00000000", webPreferences{sandbox, contextIsolation, 无 nodeIntegration}`；之后 `setAlwaysOnTop(true,"screen-saver")`、`setIgnoreMouseEvents(true)`、从自家命中测试中排除、mac 上 `setHiddenInMissionControl(true)`。尺寸取所选显示器 bounds，`showInactive()`，结束时 opacity 归零后隐藏。

**页面样式要点**（数值原样，代码不全文转录）：

| 元素 | 样式 |
|---|---|
| `#overlay` | `opacity 0 → 1`，`transition: opacity .3s ease-in-out` |
| `#glow` | `position:fixed; inset:0; pointer-events:none`；三层内阴影 `inset 0 0 50px rgba(217,119,87,.5)`、`100px … .3`、`150px … .1`；`glow-pulse 2s ease-in-out infinite`，50% 时为 65px/.7、115px/.5、165px/.2 |
| `#badge` | 胶囊：背景 `rgba(255,247,242,.95)`（不透明底，注释说明它压在任意屏幕内容上，不能像渲染层停靠条那样只用 15% 透明色），边框 `1px rgba(217,119,87,.2)`，`border-radius:999px`，`padding:8px 16px`，系统字体 13px/600，文字色 `rgb(217,119,87)`，默认 `opacity:0` |
| `#badge.flash` | `badge-center-to-corner 6s cubic-bezier(.4,0,.2,1)` 一次：0–88% 停在屏幕中央、`scale(1.4)`，100% 移到 `top:40px; left:calc(100% - 280px)` 并 `scale(.8)`、淡出 |
| `#badge-dot` | 8px 圆点，`dot-pulse 1.8s`（透明度 1↔.5、缩放 1↔.7） |
| reduced motion | 三个动画全部关闭；静态光晕仍表达状态，胶囊保持隐藏（停靠条才是常驻信号） |

截图排除：mac 上不靠 `setContentProtection`，而是截图只包含允许的应用；我们的 SCContentFilter 包含式过滤同理会把 overlay 排除在外（只要本应用不在授权表里）。原生的是另一件事：应用级的**幻影光标** `appScoped.setPhantomCursor(x,y,windowId,isClick)`（`computer_use.node`），渲染层没有对应物。

## 6. 与本项目现有样式的差异（`app/src/source-computer-use.css`）

| 项目 | 官方 | 本地现状 | 备注 |
|---|---|---|---|
| 强调色 | `--cds-fill-brand`（clay #c6613f） | `--cds-fill-accent` | 停靠条、光晕都用品牌色 |
| 行内截图 | 36×28 缩略图，点开看大图 | 行体内联，`max-height:360px` | 已改为官方缩略图（2026-10-20），放在 TurnStatus.Step 自带的 media 槽（`data-cds-row-media`，`order-last ms-auto h-[1lh]`）|
| 截图标记 | 无（仅 Chrome 6px 点） | 18px 圆环 + 脉冲、拖拽虚线、move 虚线环、scroll 方框 | 已删除（2026-10-20），连同 `source-computer-use.css` 与 `screenshotMarker` |
| 实时提示 | 停靠条：transcript 顶部、border-b、brand/20 边 + brand/15 底、8px 脉冲点、无动作无截图；只在全屏锁期间 | 已改为官方停靠条（2026-10-20），本地横幅已删除 | 用户裁定“全部照官方设计”，不再并存 |
| 减少动态 | `motion-safe:` 前缀 + `[data-reduce-motion=true]` | `@media (prefers-reduced-motion)` + `html[data-reduce-motion]` | 等价 |
| 授权卡 | 见 §1 | 已实现 | — |
| 图标 | §2.2 按动作区分（**仅聊天渲染器** cc1aae219；时间线组模式下行内也不画） | Code 页 TurnStatus.Step 没有图标槽（`leading` 只给 turn 标记用） | 2026-10-20 用户决定照聊天渲染器加上：`computerUseIcon`（shared-130 图标键 → RW 名称），步骤完成后放在动词前；运行中的行保持官方 shimmer 文字 |

## 7. 实现前待确认（本文不实现）

1. `text-muted-as-secondary` 只在 `c6a992d55-*.css` 中声明（`layout.css` 没有）；若后续调整 index.html 的样式表加载，需保留这份。
2. 风险分类表（§1.6）是官方 macOS 列表原样；Windows/Linux 部分本文未列出，本项目只面向 mac。

## 7. 2026-10-20 后续（用户决定）

- **活动面板实时卡**：官方只在 Cowork 活动面板（c21f11e6d P_）里有；按用户决定，放进 Code 会话栏（`src/source-session-rail-computer-use.jsx`），
  卡体照 c5f921d63 N（帧图 `w-full h-auto max-h-72 object-contain`、外框 P/F、说明行、Live 徽章 `CdsBadge success xs`），外壳用栏自己的
  RailCard，挂在 Background tasks 之后，不在栏的分区排序与 Show 菜单里。帧图优先用主进程实时帧（`electron/computer-use/preview.cjs`：
  会话最后看的已授权窗口，1 fps，“Background · {app}”），没有时用对话里最后一张截图（官方 `frame ?? screenshotSrc`）。
- **行图标**：见 §6。
- **光晕**：见 `docs/computer-use-glow-design-20261020.md` 状态行。
