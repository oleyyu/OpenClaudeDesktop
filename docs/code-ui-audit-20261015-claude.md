# Code UI 审计：2.31226.0 → 2.37337.1（2026-10-15，claude 侧）

范围：本机新版 Claude Desktop（`/Applications/Claude.app` 2.37337.1）的 Code 界面，对照上一轮移植基线 2.31226.0 与本地 `app/src`、`app/electron`。本轮只做研究，没有改产品代码、`HANDOFF.md`、`docs/` 其他文件或另一位 agent 的 `analysis/code-ui-unpack-20261015/`。

- 产物目录：`analysis/code-ui-audit-20261015-claude/`（方法与工具见其 `README.md`）。
- 分区报告：`regions/<区>.md`，每份含 1 组件入口与依赖、2 变化、3 本地对照、4 证据分级、5 实施顺序与验证、6 未确认项，7 复核结果。
- 全部条目：`regions/ALL-CHANGES.md`（复核后），机器可读 `data/final-changes.json`。
- 行号约定：
  - 新版写作 `<chunk>:<行>`，指 `readable/new/<chunk>`，与 `analysis/code-ui-unpack-20261015/readable/` 同名文件逐字节一致。
  - 旧版写作 `old <chunk>:<行>`，与 `analysis/code-ui-sync-20261013/readable/` 行号一致。
  - `main__*` 是主进程 `.vite/build`。

## 方法

**为什么不按文件哈希判断。** 新版 shared chunk 整体重排：旧 shared-75 → 新 shared-78，旧 shared-21 拆成新 shared-20/21，旧 shared-125/150/175/100 → 新 130/156/182/104。所以没有按文件哈希或大小判断变化，而是逐个顶层函数对照：

1. 用 babel 解析两版全部 chunk，提取导出、导入、字符串和文案。按区分性字符串给新旧 chunk 配对，不依赖文件名。
2. 把 Code 相关 chunk 格式化。范围：带 epitaxy/dframe 标记的、旧同步记录引用过的、shared-\*、frame-shell\*、全部 CSS 和主进程，共 362/421 个渲染 chunk 加 343/358 个主进程 chunk。再切成顶层单元（函数、声明符、语句）。
3. 对代码部分做标识符归一化（≤3 字符的压缩名统一替换），字符串字面量保持原样，然后全局匹配：
   - 文本相同记为 unchanged，跨 chunk 相同记为 moved；
   - 6-token shingle Jaccard ≥ 0.2 的配为 changed；
   - 其余为 added 或 removed。
   - 结果：新版 155,033 个单元，其中 unchanged 84,921、moved 52,754、changed 7,955、added 9,403；旧版 removed 3,520。
4. 另外建了三份辅助索引：GrowthBook 判定点索引（shared-25 中的 `bh`/`Xe`/`Oh`/`ch`… 及调用点）、en-US 文案增删（+1080/−339）与定义它们的 chunk、以及服务端下发文案。服务端下发文案指 shared-104 `Ql` 渲染的 6 位 id，包内没有正文。
5. 按 15 个区并行分析，每区一名分析员、一名对抗式复核员。复核员逐条重开源码行，核对变化真实性、开关归类和本地状态。
6. 覆盖扫描：把 656 个有变化的 chunk 分 12 桶，找出没有被任何区认领的 changed/added 单元并分诊，新发现的条目同样经过复核（见文末）。
7. 最终结果：
   - 334 条保留：253 confirmed、73 corrected（以复核员的更正为准）、8 条为复核员补充；4 条驳回。
   - 来源：分区 266 条，覆盖扫描 68 条。
   - 说明：工具卡片区的分析员因 API 断连重跑过一次。主流程恢复时缓存没有命中，其余 14 区又完整地分析、复核了一遍。本文与 `regions/*` 都以第二遍结果为准。

**证据分级。**
- **源码确认**：默认路径可见，调用链上没有开关。
- **功能开关**：受 GrowthBook key、平台、账号、组织策略、服务端能力或写死的开关控制。注意新版把大量 key 哈希成 `__gb__<n>`。
- **需运行态**：依赖服务端数据、服务端文案、时序，静态无法定论。

**优先级。**
- P0：本地坏了，或默认主路径明显偏离。
- P1：常见界面上默认可见的变化。
- P2：次要的可见、文案、样式或边缘状态变化。
- P3：受开关控制、只在云端或账号下出现、需要新后端，或可见度低。
- 用户截图显示该账号 `claudeai_cc_epitaxy_session_presets_main` 等开关为开，所以 home 和 composer 的几项虽受开关控制，仍标 P1。

## 结论速览

- **没有 P0。** 本地现有行为没有因为新版而坏掉；差异都是“新版多了 / 改了，本地还停在 2.31226.0”。
- **最大的可见变化是 presets 开关下的新首页。** 开关为 `claudeai_cc_epitaxy_session_presets_main`（shared-11:776-783 `_s/vs`）。截图里该账号已开启。具体变化：
  - 首页不再显示问候语和 Action Center。草稿标题显示 New session。
  - composer 固定在底部，改成单行卡片，选择器行移到卡片下方。
  - 滚动区里放一张 start card，包括 Recent environments、Choose environment、Next steps，以及合并进来的 Suggested task。
  - 开关关闭时仍是问候语 + Action Center。
- **默认可见、与开关无关的改动集中在四处：**
  - 侧栏：组间距收紧；菜单按语义分组，并新增 Collapse all / Expand all；嵌套家族缩进改了，折叠后显示失败计数。
  - 标题栏：Files 开关移到标题栏。
  - Files：HTML 默认显示源码；树缩进 10px，选中项的祖先常驻指引线；按会话记忆源码/预览视图；空文件卡；下载状态；Markdown 预览能识别空 frontmatter。
  - 设计系统样式包整体换版：约 280 个 left/right 工具类换成 start/end，新增 RTL 变体，Shortcut 字距收紧。
  - 应用外壳新增“磁盘空间不足”提示（可用空间低于 10 GB）。
  - 侧栏 ⇧⌘⌫ 和 ⌥⌘A 两个归档快捷键都会跳过置顶或运行中的会话。
- **主进程（preview 服务）：** dev server 默认改为“占用时顺延到下一个空闲端口”，启动后还会校验监听进程是否属于自己。GrowthBook 2711562102，默认 true。
- **大量新功能本地不适用**，原因是只在云端或账号下出现，或需要新后端：
  - SSH 环境与主机密钥重连；
  - `/subtask` 子任务会话；
  - PR/CI 卡片（Fix the failing checks、review comments），依赖云端查询；
  - 统一插件页、组织策略相关的浏览器限制；
  - turn box（收尾框）。
  - 这些按“功能开关 / 不适用”记录，不建议照搬。
- **截图中两样东西在渲染器源码里找不到来源，要在安装版用 DevTools 确认：**
  - 首页全屏的“文字雨”背景；
  - 账户行右侧的图标。
  - 宠物精灵（Clawd）有源码：它的定位类在 cc43287c9:32111-32133。

## 分区统计（复核后）

| 区域 | 变化 | P1 | P2 | P3 | 源码确认 | 功能开关 | 需运行态 | 需调整 | 部分 | 已一致 | 不适用 | 未知 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| home 首页 | 19 | 4 | 5 | 10 | 3 | 15 | 1 | 8 | 1 | 2 | 7 | 1 |
| sidebar 侧栏 | 30 | 2 | 10 | 18 | 12 | 14 | 4 | 12 | 4 | 1 | 13 | 0 |
| topbar 顶部栏 | 14 | 1 | 4 | 9 | 6 | 8 | 0 | 6 | 1 | 3 | 4 | 0 |
| composer 输入框 | 29 | 1 | 6 | 22 | 6 | 21 | 2 | 10 | 1 | 5 | 13 | 0 |
| transcript 对话内容 | 33 | 0 | 3 | 30 | 10 | 14 | 9 | 4 | 4 | 4 | 20 | 1 |
| toolcards 工具卡片 | 24 | 0 | 2 | 22 | 5 | 12 | 7 | 5 | 3 | 1 | 14 | 1 |
| files | 29 | 1 | 12 | 16 | 23 | 6 | 0 | 16 | 6 | 2 | 5 | 0 |
| diffgit Diff/Git | 18 | 0 | 4 | 14 | 12 | 6 | 0 | 10 | 2 | 2 | 4 | 0 |
| terminal | 18 | 0 | 7 | 11 | 12 | 5 | 1 | 11 | 2 | 2 | 3 | 0 |
| preview | 19 | 1 | 3 | 15 | 9 | 9 | 1 | 6 | 5 | 0 | 8 | 0 |
| tasks 任务与子代理 | 17 | 0 | 0 | 17 | 5 | 10 | 2 | 5 | 2 | 0 | 10 | 0 |
| settings 设置 | 24 | 0 | 1 | 23 | 2 | 17 | 5 | 1 | 0 | 2 | 21 | 0 |
| menus 菜单 | 18 | 0 | 2 | 16 | 2 | 12 | 4 | 2 | 0 | 5 | 11 | 0 |
| layout 分屏与弹窗 | 18 | 0 | 2 | 16 | 5 | 9 | 4 | 3 | 3 | 5 | 7 | 0 |
| global 全局样式 | 21 | 1 | 3 | 17 | 13 | 8 | 0 | 7 | 0 | 4 | 10 | 0 |
| 未归区（覆盖扫描） | 3 | 0 | 0 | 3 | 0 | 3 | 0 | 0 | 0 | 1 | 2 | 0 |
| **合计** | **334** | **11** | **64** | **259** | **125** | **169** | **40** | **106** | **34** | **39** | **152** | **3** |

各区数字已包含覆盖扫描归到该区的条目。

## P1 变化清单

| id | 变化 | 新版依据 | 旧版依据 | 证据 / 开关 | 本地 |
|---|---|---|---|---|---|
| home-01 | 开关开时首页改为 New session 标题 + start card + 底部 composer，不再显示问候语和 Action Center；开关关时仍为旧形态 | cc43287c9:6028-6042（`TB/EB/DB`，DB 返回 "start-card"），cc43287c9:46313 | old cc43287c9:45025-45033；old shared-21 kE 居中布局 | 功能开关 `claudeai_cc_epitaxy_session_presets_main`（截图为开） | 需调整：app/src/main.jsx:6223-6225 |
| home-02 | Start card 新增 Recent environments（最多 3 项，选中项打勾，路径 tooltip）+ Choose environment⌄（锚定打开环境/位置菜单） | cc43287c9:23674-23779，28876-28948 | 新增 | 同上 | 需调整：app/src/recent-folders-model.mjs:57 只有文件夹 |
| home-03 | Start card 新增 Next steps：合并 setup 行、等待中的会话、backlog；同类合并为 “and # more”，最多 3 行，可 dismiss（startCardDismissals） | cc43287c9:23411-23610，23153-23361 | old cc43287c9:24885-25214 | 同上；auto-mode 行另受 `ccd_auto_default_mode` | 需调整：app/src/home-model.mjs |
| home-06 / composer-04 | 环境栏（TX）：高度 min-h-8→min-h-6，加 container query 与 mode 槽；地点 chip 去掉 caret，占位文字 Folder→Choose…，多仓库显示 “名称 +{count}”，右侧是模型 + effort + 用量环 | cc43287c9:17852-17976，20056-20313 | old cc43287c9:17885-17985 | 同上 | 需调整：app/src/source-composer.jsx:631-790 |
| composer-01 | presets 开关下输入框变成单行卡片（控件 28px、圆角 14px），关闭多行，+ 在左，Send 只在有草稿时出现，麦克风作空闲动作 | cc43287c9:33467-33510，34523-34545；ca80fca8d:13156-13336 | old cc43287c9:32677-32712 | 同上，且 `!composerOnly` | 需调整：app/src/source-composer.jsx:631-703、843-880 |
| sidebar-01 | Code 模式在 New 上方出现 Search 字段，旧版 Code 列表会压掉这个字段 | shared-22:13790-13810，shared-21:9468-9478 | old shared-22:13628-13660 | 功能开关：hub look `Ld()` 且 `__gb__1669033294`（截图为开） | 需调整：app/src/source-sidebar.jsx:1537-1541 |
| sidebar-09 | Code 列表组间距收紧：`--df-group-band-mt` 从 18px 改为 8px，导航块下补 10px，组 caret 只在悬停时显示 | shared-styles-C6yuIsHz.css:388-397，455-466 | old shared-styles-CTu5t_TM.css:387-397 | 源码确认 | 需调整：app/src/source-sidebar.css |
| topbar-01 | Files 开关移到标题栏的 inline 开关末尾（Folder 图标，快捷键 toggleBrowser），View options 里不再有单独的 Files 行 | ca80fca8d:33441-33578（可用条件在 :33463-33466） | old ca80fca8d:31910-32032 | 源码确认 | 需调整：app/src/source-titlebar.jsx:476-560 |
| files-01 | Files 窗格打开 .htm/.html 时默认显示源码，Eye「Preview」再切到渲染 | cccc2cf0a:6723（`defaultView: sr.test(path) ? "source"`），shared-28:15591 | old cccc2cf0a:6588 | 源码确认 | 需调整：app/src/source-file-viewer.jsx:796-802 |
| preview-01 | dev server 端口被占用时顺延到下一个空闲端口：从配置端口向上找 20 个，跳过运行中或被其他条目钉住的端口，脚本写死端口时不顺延；以前是直接失败 | main__index.chunk-BWk6pVUt.js:254432-254450 | old main__index.chunk-CiiI592G.js:251842-251866 | GrowthBook 2711562102（默认 true） | 需调整：app/electron/preview-launch.mjs:127、preview-service.cjs |
| global-01 | 设计系统样式包整体换版：shared-styles 3014→3358 行（Code 侧栏 band 间距、家族导轨、43 条 `[dir=rtl]` 规则）；c6a992d55 类选择器删 527 增 1107，其中约 280 个是物理→逻辑替换；Anthropicons 新增 ListCard 字形 | shared-styles-C6yuIsHz.css:388-640；c6a992d55-CNGsCU46.css；shared-frame-CegduNQ2.css:3 | old shared-styles-CTu5t_TM.css:387-616；old c6a992d55-C0zTICcS.css | 源码确认 | 需调整：app/scripts/prepare-ui.mjs:15、28、84-87（换源）；连带 global-v01 |

## 主要 P2（源码确认、需调整）

| id | 变化 | 新版 | 本地 |
|---|---|---|---|
| home-08 / composer-11 | Clawd 精灵位置：right -16→-13px，bottom 跟随 `--cds-ring-outer` | cc43287c9:32111-32133 | app/src/source-composer.css:133 |
| home-10 | 本地环境变量对话框的 footer 改为通栏分隔线 | c3f9f1667:334；c29df1c52:141-146 | app/src/source-local-environment-dialog.jsx:122 |
| sidebar-02/03/04 | 空白区和组标题右键菜单按 new/edit/view/remove 分组，新增 Collapse all / Expand all，空白区去掉批量归档/删除 | shared-21:11890-11985；shared-19:22534-22610；shared-20:4799-5004 | app/src/source-sidebar.jsx:1781-1825 |
| sidebar-05 / topbar-05 | 会话行菜单与标题菜单共用一套分组：open→edit→share→organize→settings→view→staff→panes→remove，组间自动分隔 | ce4f4374c:629-888 | app/src/source-sidebar.jsx:278-336 |
| sidebar-06 | 多选菜单：分隔线调整，Archive/Delete 计数改用 lifecycleCount | ce4f4374c:1096-1302 | app/src/source-sidebar.jsx:196-232 |
| sidebar-07/08 | 折叠的嵌套家族显示 “{count} failed”；缩进改用 `--df-row-indent`，树线改用 `:after` | shared-21:22713-22782；shared-styles-C6yuIsHz.css:597-640 | app/src/source-sidebar.jsx:1359-1393；source-sidebar.css:384-430 |
| sidebar-10 | 行高变量只作用于会话列表；Pinned 和导航行回到 26px | shared-styles-C6yuIsHz.css:402-430、534-540 | app/src/source-sidebar.css:4-16 |
| sidebar-11 | 单击当前已打开的会话行时，聚焦它的 composer 并把光标放到末尾 | shared-21:24086-24094；shared-16:6569-6583 | app/src/source-sidebar.jsx:1219-1244 |
| topbar-03/04 | 草稿页显示 Terminal/Browser 开关；开关顺序 Terminal→Changes→Preview/Browser→Files。新旧版都如此，是本地早已存在的差距 | c593f7513:7555-7619；ca80fca8d:33505-33576 | app/src/source-titlebar.jsx:476-538 |
| composer-07 | @ 提及的 Files 结果合并本会话写过或编辑过的文件（上限 50） | cc43287c9:15606-15685 | app/src/main.jsx:2124-2160 |
| composer-08 | IME 组字边缘保护（`​` 哨兵）；粘贴前先结束组字 | shared-28:3265-3415、4250-4325 | app/src/source-composer-editor.jsx:161 |
| transcript-02 / tasks-01 | Tab 焦点移到视口上方时释放底部跟随（attachTabFocusRelease）；主对话和子代理视图都适用 | c9f414608:7-66；cd5a31703:87768-87803；cccc2cf0a:13043-13076 | app/src/use-transcript-scroll.js:54-62；source-agent.jsx:17-33 |
| transcript-03 | Suggested task 卡标题最多 6 行，并发布底边位置变量 | cf74bc599:2827-2832 | app/src/source-suggested-tasks.jsx:51 |
| toolcards-01 | 审批卡“读完门”扩展到所有 MCP 工具和桌面连接器（loose 模式） | cd5a31703:7578-7591、13146、13200-13207 | app/src/source-approval-card.jsx:41 |
| toolcards-02 / preview-02 | dev server 启动审批的副标题加 “(or the next free port)” | cd5a31703:10675-10682、13002-13037 | app/src/approval-card-model.mjs:518-528 |
| files-08 | 文件树常驻指引线：选中项和当前文件的祖先不悬停也显示（`--file-tree-kept-guides`）；复核后从 P1 降为 P2 | cccc2cf0a:5439-5455、5548-5551、4824 | app/src/source-session.css:878-885 |
| files-02..07, 12, 13, 16 | 源码/预览视图按会话+路径记忆（32 项 LRU）；空文件卡；Create file 后切到源码；卡片文案去句号，CSV 失败卡拆分；Auto save 去掉开关；树缩进 8→10px；图片右键 Copy image；下载时的替换字符警告与原始字节下载；CodeMirror 更新 | cd2efac6e、cccc2cf0a、ce9ca5630、cbd02b8f2（见 regions/files.md） | app/src/source-file-viewer.jsx、file-tree-row-model.mjs、file-context-menu-model.mjs 等 |
| diffgit-01 | Review 发现卡改版：Claude 头部、图标化的 Next、底部 Fix this one、Line/Lines 标签 | c44d00c7f:2447-2626 | app/src/source-pane-review.jsx:70-96 |
| diffgit-02 / 15 | Uncommitted 范围按会话持久化（最多 50 个）；工作树干净时不提供 Uncommitted | c03935b01:887-916；cb61be3a2:473-478、689-690 | app/src/source-diff-scope.jsx:112-124 |
| diffgit-03 | Changes 树缩进 10px，悬停显示指引线，活动文件常驻指引线 | ce9ca5630:4-80；c44d00c7f:6053-6065 | app/src/source-diff.jsx:430-433 |
| terminal-01/02/04/10/11 | 有选区时单击链接不打开；Cmd/Opt+←/→ 先滚到底；附加选区时保留首行缩进；标签和溢出菜单按 Delete/Backspace 关闭时要求没有按修饰键 | c6bf19e8f:2425-2439、3253-3265；cccc2cf0a:2324-2361；cfe7c4b3b:160-262、438-449 | app/src/source-terminal-pane.jsx、terminal-navigation.mjs 等 |
| terminal-03/08 | ESC c 清除命令标记；标题里的 `~`、`/` 正确显示（适配器需按新版重新提取） | c6bf19e8f:2167-2182；cf718f694:114-133 | app/src/generated/code-editor/* |
| preview-03 | 启动后校验监听进程是否属于自己的进程树，不属于就报错并给出说明 | main__index.chunk-BWk6pVUt.js:255555-255590 | app/electron/preview-service.cjs:1160-1230 |
| preview-05 | Run 找不到可用的 launch.json 条目时弹 toast | cf580efe9:1473-1558 | app/src/source-preview-pane.jsx:516 |
| settings-01 | Worktree location 说明改为 “…on this computer.” | cd19fedd2:274-292 | app/src/source-settings.jsx:394 |
| menus-01 / global-06 | Shortcut text 变体字距 0.3em→0.15em | shared-frame-BjUcQ1Qc.js:2523-2566 | app/src/source-shortcut.css:23-28 |
| menus-02 | ⌥⌘A 归档 chord 对置顶或运行中的会话静默不响应 | cf74bc599:15418-15419、15598-15625 | app/src/main.jsx:2605 |
| layout-01/02/03 | 分屏分隔条支持 Home/End；侧聊按住 Escape 时吞掉重复事件；Open in main window 会先显示主窗口再聚焦 | shared-23:18856-18883；cccc2cf0a:14771-14802；c5638815a:546-607 | app/src/source-split-view.jsx:118-153；source-side-chat.jsx:156；app/electron/main.cjs:2549 |
| global-v01 | 新包删除了 `.mr-xs` 和 `.pl-[2px]`。本地两个从旧版抽出的生成模块仍在用，换包后间距会丢，需要按新版重新抽取或改成 `me-xs`/`ps-[2px]` | c6a992d55-CNGsCU46.css:5833、20668；ca80fca8d:7208；cfe7c4b3b:273 | app/src/generated/code-editor/preview-element-chip.mjs:99、preview-tab-overflow.mjs:131 |
| cov7-01 | 侧栏 ⇧⌘⌫ 归档跳过置顶和运行中的会话，并且不调用 preventDefault | shared-16:7725-7792（:7748-7757） | app/src/source-sidebar.jsx:1101-1113 |
| cov3-01 | 附件文件卡的文件名按情况截断为 2–4 行，过长时保留结尾 12 个字形和扩展名（用户消息附件和 composer 附件都用这个组件） | shared-2:1031-1047、1818-1921 | app/src/source-session.jsx:520-534；source-composer-attachments.jsx:20-47 |
| cov9-01 | Markdown 预览能识别空 frontmatter（`---` 紧跟 `---`）。旧版会画两条分隔线或吞掉一段正文 | c3fde7009:2213-2229、2739-2749 | app/src/file-markdown-model.mjs:237-245 |
| cov0-04 | 应用外壳新增 DesktopLowDiskToast：可用空间低于 10 GB 时提示 “Low disk space: {free} free”，带 Manage storage，7 天内只提醒一次（只在桌面宿主出现） | cf615570b:8-70；shared-23:21131-21150、24339 | 本地无；存储设置页 app/src/source-settings-pages.jsx:120-167 |

P3 以及“不适用”的条目（SSH 环境、`/subtask`、PR/CI 卡片、统一插件页、组织策略、turn box、云端会话等）见 `regions/ALL-CHANGES.md` 和各区报告。

## 分区要点

每区的组件入口、依赖、调用链和全部行号在 `regions/<区>.md` 的第 1、2 节，以下只列入口与结论。

- **首页（home）**
  - 入口：会话/草稿窗格 `y5`（cc43287c9:45973-46839，旧 Q3）；形态选择 `DB/TB/EB/wB`（cc43287c9:6028-6042，旧在 shared-21 EE/DE）；start card `b$/x$/C$/w$`（:23674-23801，新增）；Next steps `p$…a$`（:22998-23610）；槽位与居中算法 `iV/tV/eV`（:6398-6481，旧 shared-21 kE）。
  - 旧版 F0/O0/D0 建议列表已删除。
  - 本地要新增 start-card 模式，同时保留问候语 + Action Center 作为开关关闭和分屏下的回退。
  - Recent environments 在本地只能映射到文件夹（从会话 cwd 推断“用过的”）。
- **侧栏（sidebar）**
  - 入口：`FrameSidebar tN`（shared-22:15202-15580）、`FrameSidebarNav _j`（shared-22:13678-13900）、Search 三个入口（shared-21:9442-9538）、导航行 `rR/sR/HZ`、Code 列表宿主 `JA/$A/Cj`、分组 `JS/_E`。
  - 变化集中在三处：CSS（组间距、行高、家族缩进）、四类菜单的分组重排、嵌套家族 stub。
  - Projects (Beta) 导航和文件夹组 Archive all 旧版就有，本地缺，不属于本次变化。
- **顶部栏（topbar）**
  - 入口：标题栏 `Ch/wh`（c593f7513:8510-8756，旧 jm/Mm）、框架 `km/Am`、菜单模型 `hh`、开关组 `ah/ih`。
  - Files 开关进标题栏是默认可见的变化，其余是 presets 开关下的 New session 标题和菜单分组。
- **输入框（composer）**
  - 入口：控制器 `H8`（cc43287c9:37604-45683）、输入区 `O3`、`gR/_R`（ca80fca8d:15300-16959）、卡片 `ZF`、Send/Stop `XF`、chin `g0/_0`。
  - 新增 slash（`/subtask`、`/ultrareview`、send-to-project 等）以及 Bypass permissions 的转场文案（cc0051c10）。这些多依赖云端或新的内核能力，本地评估为 P3。
- **对话内容（transcript）**
  - 入口：会话视图 `Lx`（cf74bc599:5508-6600）、对话区 `Ab`、Feed `vlt/ylt/llt/clt`（cd5a31703:93107-95697）、行构建 `yL/xL`、更早消息分页 `S9`。
  - 消息 edit/restart 的规则与错误文案（c21f11e6d，一批新文案）都依赖云端会话能力，本地不适用。
  - 本地可做三项：Tab 焦点释放跟随、Pin/评分按钮的按下态、建议卡截断。
- **工具卡片（toolcards）**
  - 入口：工具行 `YRe`（cd5a31703:32215-32776）、工具组 `L8e`、审批卡 `DO/TMe/cA/mA`、问题卡 `At`（ccae33cda）、计划卡标签 `rT`。
  - 本地可做两项：MCP 审批读完门，以及端口顺延文案。
  - 不跟进：turn box、MCP app widget、CLAUDE.md 大小提示。前两者需开关或服务端，大小提示的阈值由 CLI 决定。
- **Files**
  - 入口：宿主 `UT/kT`（cccc2cf0a:13864-14146）、主体 `Xb`、头部 `lx`、选项菜单 `dx`、树 `gy/cb`，查看器在 cd2efac6e。
  - 这一区源码确认的条目最多（18 条），最适合优先做。
- **Diff/Git**
  - 入口：`kT → Mx`、ChangesView `El`（c44d00c7f:6804-7477）、虚拟列表 `Is`、发现卡 `va`、树行 `Pc/Fc/Nc/Mc`。
  - CI/PR 相关条目需要云端查询，本地不适用或需要新后端。
- **Terminal**
  - 入口：`jT`、`y_/b_`、标签 `F_/O_`、通用标签条 `we/de/re/ie`（cfe7c4b3b）、`ShellTerminal ai`（c6bf19e8f:3468-4157）。
  - 多数是键盘和链接细节，以及适配器需要重新提取。
- **Preview**
  - 入口：`ga`（cf580efe9:4523-6176）、启动 helper `Kr/qr/Yr/Xr`、Dev servers 菜单 `ai`、主进程 launch 与端口逻辑。
  - 重点是主进程端口顺延和身份校验。组织策略文案（c58115fda）本地不适用。
- **任务与子代理（tasks）**
  - 入口：Tasks 列表 `Vw→Fw`、任务卡 `xw`、子代理视图 `bT/yT`、Plan pane（cccc2cf0a:968-1569）。
  - 工作流代码本次没有功能变化，用户手改的 `source-workflow.jsx` 等不用动。
- **设置（settings）**
  - 入口：设置弹窗 `$O`（shared-19:5726-5977）、导航分组 `BC`、宽屏/窄屏导航。
  - 默认路径上只有 Worktree location 说明这一条变化。Interface font 移到 General（`__gb__1197194941`）和合并的 Plugins 页（`__gb__2406162393`）都需要运行态确认。
- **菜单（menus）**
  - 入口：原生菜单 `I1r` 等（main__index.chunk-BWk6pVUt:206653 起）、命令面板 `CommandPaletteBody`（c2771e1f6）、Actions 目录 `bz`（shared-1:14662-15749）、Code 会话命令 `SO`（cf74bc599:15333-15651）。
  - 原生菜单结构没有本地需要跟进的变化。命令面板的默认视图受 `__gb__1669033294` 控制，需要运行态确认。
- **分屏与弹窗（layout）**
  - 入口：split host `q4`（shared-23:19671-19845）、pane store（shared-16:821-1131）、分隔条 `X2/$2/e4`、拖入覆盖层与停放、窗格菜单（shared-20:8668-8891）。
- **全局（global）**
  - 入口：c6a992d55、shared-styles、shared-frame 的 CSS，Anthropicons 字体与码点表、Shortcut、Button 按压缩放。
  - 本地换版：`prepare-ui.mjs` 指向 installed-2.37337.1。另外两个生成模块要跟着改，见 global-v01。
  - global-02（账户行 `pl-[var(--df-row-px)]` 类被删）复核后改判为已一致：本地 `style.css:394-403` 有非 layer 规则覆盖，换版后像素不变。
  - RTL：新包已自带逻辑属性，本地没有 RTL 语言，不必另做 RTL 工作；RTL 专用的 8 条文案不翻译。

## 建议实施顺序

1. **样式包换版（global-01/02/06，menus-01）。** 先做，因为后面各区的 CSS 比对都以新包为准。
   - 改 `prepare-ui.mjs` 的源和文件名；按 2.37337.1 重新抽取 `generated/code-editor`，或手改 `mr-xs`/`pl-[2px]`（global-v01）；`.scds` 字距 0.15em。
   - 验证：`npm run build`、tooltip-ui-test（3.6px 断言要改）、settings-ui-test、sidebar-ui-test 的截图比对。
2. **Files 与 Diff 树（files-01..08/12/13，cov9-01，diffgit-03）。** 都是源码确认的条目，相互独立。
   - 验证：files-pane-ui-test、file-editor-ui-test、changes-pane-ui-test，单元测试 file-tree-row-model。
3. **标题栏 Files 开关和开关顺序（topbar-01/03/04）。**
   - 验证：titlebar-ui-test、files-pane-ui-test、menus-states-ui-test 的 View options 期望。
4. **侧栏 CSS、菜单分组和归档快捷键（sidebar-02..11，topbar-05，menus-02，cov7-01）。**
   - 验证：sidebar-ui-test、sidebar-rest-ui-test、sidebar-chrome；补 zh-CN（Collapse all / Expand all / {count} failed）。
5. **presets 新首页与单行输入框（home-01..07，composer-01..04/11，sidebar-01）。** 改动面最大。
   - 建议加一个本地偏好（默认开，与截图一致），旧问候语路径继续保留。
   - 验证：home-page-ui-test、composer-states-ui-test，并在已安装的 2.37337.1 截图对照。
6. **Preview 主进程（preview-01/03/05，toolcards-02）。**
   - 验证：preview-ui-test，新增“端口被占用→顺延”和“端口被抢→身份不符”两个场景，approval-card 单元测试。
7. **键盘与焦点细节**：terminal-01..13、transcript-02 / tasks-01（共享 tab-focus-release 模块）、layout-01/02/03、composer-07/08、diffgit-01/02/15、cov3-01 附件卡截断。
   - 如需对齐，可在这一步加磁盘空间提示（cov0-04）：主进程要新增 `getFreeDiskSpace`。
   - 验证：terminal-ui-test、transcript-scroll-ui-test、split-windows-ui-test、changes-pane-ui-test。
8. **新文案补 zh-CN。** Code chunk 内新增约 300 条文案，只翻译实际移植的那部分。验证：`tests/i18n.test.mjs`。

功能开关、云端或账号相关的条目只记录不实施。如果以后要做 `/subtask`、SSH 环境或 PR/CI，需要先定后端方案（composer-06、home 区未确认项）。

## 未确认项（需运行态）

1. 首页全屏“文字雨”背景和账户行右侧图标的来源：在已格式化的渲染器代码里没有找到，需在安装版用 DevTools 确认是否属于产品，还是宿主或 main 注入。
2. 该账号以下 GrowthBook 值，静态只能看到默认值：
   - `__gb__1669033294`：Search 字段，以及 ⌘K 默认视图和行操作卡片；
   - `__gb__1197194941`：Interface font 移到 General；
   - `__gb__2406162393`：合并的 Plugins 页；
   - `__gb__2446046106` / `__gb__616667399`：Changed files 列的位置和默认扁平列表；
   - `__gb__81656526`：子代理列表的 content-visibility；
   - 2711562102：端口顺延（默认 true）；
   - 2371478310 / 主进程 `n.bu()`：turn box。
3. presets 开关在已有会话中是否同样让输入框变成单行卡片：`wo` 只排除 composerOnly，需要打开一个现有会话确认。
4. 服务端下发文案（`Ql`/`bp` 的 6 位 id，例如 `qh9bkk`、`gp2uz4`）的正文。
5. Files 开关在真实会话标题栏里的位置、文件树常驻指引线的确切范围、新版 Changes 窗格默认的列布局。
6. fizzy “panels” 设计变体（`data-cds-fizzy`）的启用条件和它对间距的影响。
7. 新 Anthropicons 字体除新增 ListCard 外是否重绘了其他字形：本机没有 fontTools，比较不了字形数据。

## 驳回项（复核认定不是变化）

- home-17：“Action Center 删除 fix_ci 建议”。复核发现 cd4f82e77:225 仍有 fix_ci，规则集 :281-287 也还包含它。
- composer-09：“发送后忘记撤销历史”。`rC/iC`（shared-28:6931-6964）没有导出给 Code composer。
- cov2-04：“Artifact 链接卡显示作者和更新时间”。只在 c19e90103 的 at-rest 或 qy 路径出现，不是 Code 转录的变化。
- cov5-06：“Projects 页可按 id 搜索、导入页新增入口”。c17beaa76 只服务 claude.ai 的 /projects 路由（c1b9abf13:224），不是 Code 界面。
- 第一遍复核中另有一条驳回：menus-15“面板关闭后焦点归还忽略 focus guard”，旧版 ca1d33d05:1364、1435-1439 已是同样逻辑；第二遍分析没有再报这一条。

## 覆盖扫描

12 个桶共分诊 20,430 个单元，范围是有变化的 chunk 里所有 changed、added，以及归到这些 chunk 的 removed 单元：

| 已被各区覆盖 | 非 Code 界面 | 非 UI 管道 | 噪声（格式、压缩名、重排） | 未覆盖的 Code UI |
|---|---|---|---|---|
| 2,400 | 3,032 | 6,294 | 7,730 | 974 |

- 974 个未覆盖单元归并成 68 条变化，逐条复核后驳回 2 条（cov2-04、cov5-06），其余写进 `regions/coverage-<n>.md|json`，并按 region 字段合并到上面的统计。
- 默认可见、需要本地跟进的只有 4 条 P2：cov7-01、cov3-01、cov9-01、cov0-04。
- 其余是 P3，大部分不适用。主要有四类：
  - Projects (Beta) 页与 Artifacts 页的内部改版（cov0-01/02、cov11-03/04、cov5-04、cov9-05、cov6-02）；
  - 云端或自托管环境与 Routine 表单（cov3-02、cov5-05、cov9-08、cov5-11）；
  - SSH 会话错误（cov2-02、cov5-03）；
  - iOS 模拟器（cov10-03、cov4-01、cov3-05）。
- 本地值得考虑的 P3：
  - Routine 启动失败的 toast 带上原因（cov11-01）、分支选择器区分“无分支”和“无匹配”（cov1-03）；
  - “Session not found on disk” 空态对已归档会话不再显示 Archive（cov2-05）；
  - 侧栏宽度拖拽在窗口外松开时自动结束（cov8-01）；
  - Ctrl+Tab 循环切换会话时，进入折叠分组会自动展开（cov7-02）；
  - 新建 worktree 时拒绝符号化的 remote-tracking ref 作为起点（cov8-02）。
- 局限：
  - 各桶的“噪声”和“非 UI 管道”是分诊员按 chunk 和单元抽查判定的，没有逐个人工复核。
  - 主进程 7 MB chunk 里包含打包的依赖，它的 added/changed 单元大多归入这两类。
