# 2.42304.0 Code UI 源码迁移进度（接手轮，2026-10-17）

目标：把 OpenClaude 的 Code UI 按官方 Claude Desktop **2.42304.0** 源码尽量 1:1 接入，并核对一致性。**整体 1:1 仍未完成**，本文只记录本轮已落地的部分、验证到哪一层、还剩什么。

验证范围限于源码、AST、SSR、受控事件和本地测试。没有打开 GUI 或浏览器，没有用截图，没有发真实模型、核心或 GitHub 请求，没有安装或替换应用。仓库里原有的未提交修改都保留了，最初的备份 `claude-ui-lab-backups/openclaude-0.2.186-before-ui-2.37337.1-20261015-194822/` 没有动过。

## 怎么找证据

| 内容 | 位置 |
|---|---|
| 每批的 runId、断点和恢复方式 | `analysis/code-ui-migrate-20261017/RUNLOG.md`，机器可读版 `workflow-runs.json` |
| 整合决定（归属、协议、产品取舍） | `analysis/code-ui-migrate-20261017/specs/decisions.md`（D0–D28） |
| 调研报告与工作项 | `analysis/code-ui-migrate-20261017/research/`（`b1-results.json` 共 98 个工作项） |
| 每条实施线的报告（官方文件、绑定、特征串、宿主差异、测试） | `analysis/code-ui-migrate-20261017/reports/R1/`、`R2/`、`R3/` |
| 构建与全量测试日志、与基线的对比 | `analysis/code-ui-migrate-20261017/logs/` |
| 台账 | `analysis/code-ui-unpack-20261015/source-migration/migration-status.json`；每轮改了什么见 `reports/R*/ledger-*.json`；改前备份 `analysis/code-ui-migrate-20261017/ledger-backup/` |

所有批次都通过本会话里的 Workflow 工具实际运行，runId 记在 RUNLOG 里。不在 RUNLOG 里的批次都不算启动过。

## 基础设施

- **生成器**：官方压缩 chunk 经 prettier babel 解析、按绑定抽取，写进 `app/src/generated/<area>/` 和 `app/electron/generated/`，每份都带 `manifest.json`（源文件、sourceSha256、referenceVersion）。生成物不手改。`prepare-ui.mjs` 会自动发现 `scripts/verify-gen-*.mjs`，构建时对全部生成器做 `--check`。
- **`extract-code-ui-current.mjs --only <target,...>`**：只生成或只校验指定 target，写入时加目录锁，`--check` 会汇总全部不一致。已验证全量重跑与 `--only` 重跑的产物逐字节相同。这让多条线可以并行改同一个生成器。
- **测试**：容器 Node 26 + 私有 Vite 缓存。全量约 4 分钟，每轮 gate 都与接手时的基线失败清单（38 条，多数和容器环境有关）逐条对比，只有新增失败才计为回归。
- **台账工具** `tools/apply-ledger-updates.mjs`：只接受规定的 6 种状态，旧状态写进 history，首次写入前先备份，并支持新增条目（`add`）。

## 已落地（按区域）

### 共享依赖与样式

- view-tabs 共享依赖图从 2.37337.1（27 模块 / 2326 bindings）**重建到 2.42304.0**（28 模块 / 2529 bindings），新增 40 个语义名（`CdsSegmentedControl`、`CdsButton`、`CdsTooltipProvider`、`CdsDensityContext`……）。压缩名在新版里会被复用，所以根入口都加了特征断言，宿主只能按语义名导入（有测试守卫）。
- code-current 里残留的 2.37337.1 CDS 副本（Badge、density context、Pulse、mergeProps、clsx）已经删除，改为 re-export view-tabs 原件（SG-2）。
- 样式兼容层改成 AST class-token 精确匹配（SC-0）。旧的子串扫描有 36 条假阳性，规则数从 **63 降到 10**。物理方向类改成了官方用的逻辑类（SC-1）。
- 已知根因：`style.css` 里未分层的 `button/input` reset 会压过官方 `@layer utilities`。R1 的回合页脚按下态就是这样出错的，后来用真实层叠测试（lightningcss）修复并钉住。全局处理放在 R3（D26）。

### 标题栏 Chat／Code 切换

- 改用官方 `df-app-switch` 和 CDS SegmentedControl（`sidebar_app_switcher` 开的分支），经 `extract-app-switch.mjs` 生成。侧栏折叠时 peek 卡顶部的切换（W2）和 ⌥⌘←/→ chord（W3）也都接上了。旧的 `code-ui.jsx` Sidebar 死代码已删除（W5）。
- 宿主差异：home 段名固定为 "Claude"（D11）；没有埋点和路由预取；peek 是本地浮动卡片，不是官方的满高抽屉。thumb 动画、拖拽区命中这类需要运行时确认的项写在 `reports/R2/R2-appswitch.md`。

### 侧栏、sections、Sessions 页

- 侧栏 helper：code-current 的 119 个模块里有 109 个已是 2.42304.0。剩下的 10 个（筛选 3 个、嵌套会话 4 个、button-press、tooltip-structure、breadcrumb-view）都排进了 R3。
- 侧栏宽度拖拽改用官方 shared-21 DF 和 CDS ResizeHandle：丢失 pointerup 时，200ms 后结束并提交宽度（cov8-01）。
- 手动 sections：2.42304.0 的 sections 模型、16 个 store 动作、视图菜单和新建对话框都已原样抽取（27 模块 / 219 bindings）。本地持久化放在 `config.sidebarSections`，从旧的 `customGroups/customGroupId/ccg::` **无损种子化**，旧字段不删（D10）。种子化等切换到 sections 布局时才做，不在启动时做，避免过渡期丢掉经典列表的改动。**布局接线在 R3**，侧栏目前仍显示经典列表。
- Sessions 页视图迁到 cbd6c85c8 gd/_d。搜索词和排序只在返回同一历史项时恢复（cov11-02）。Code 行不再显示 Archived 徽标，与官方一致。还缺 /btw 子会话过滤（pb）和多选计数，已排进 R3。

### 首页与环境

- start card 主体、Recent environments（保留本地最近文件夹，路径做 `~` 化，见 D14）、环境对话框与目录视图、presets/basename/parent/field controls 都已升到 2.42304.0。
- 环境菜单的 h2 结构、Clawd 改用官方类串、对话框的 Add 控件排在 R3。

### Composer

- IME 组字守卫、@ 产出文件、聚焦能力指向 2.42304.0。新建 `extract-code-composer.mjs` 生成器。
- Send/Stop 换成官方 send cell（`lM`），运行中 placeholder、500ms 停止保护、`scheduleFocus({yieldsToUser})`、500ms 防误触 Enter、审批后交还焦点都已接上。
- 环境栏（l0/u0/a0）、row chin、CDS ChatComposer 外壳、`/copy [N]` 排在 R3。

### 嵌套会话与 /btw

- /btw 标题、焦点意图、owner-document 和 side-session 提示词改从 2.42304.0 生成。
- 自动归档谓词补上了 PR 和后代级联：父会话归档时，已 settled 的子会话一起归档（NBS-7）。
- 窗格里显示的子会话会标为已读，并抑制自动未读（NBS-5，跨窗口部分仍有差异）。
- 子窗格的会话错误卡可以 Dismiss（SourceTurnError 的可选 onDismiss，已对照 cb1a6e506 原文），发送错误会去重（NBS-6 部分）。
- 嵌套 helper 升级（NBS-2）、nested_less_side_chats（NBS-3）、页签右键菜单（NBS-4）排在 R3。

### 文件、Diff、终端

- CodeMirror 编辑器层迁到 2.42304.0：28 个模块是字节拷贝，wrapper、theme、语言识别、按键重复从源码抽取，包括 Makefile 默认用 Tab 缩进。
- 25 个文件和终端 helper 已切到新版（FT-01）。
- Uncommitted 范围按会话持久化（FT-08）。
- 评论框和选区 chip 关闭后会抑制按住 Escape 的重复（FT-10）。
- worktree 未提交检查行改为 shimmer，500ms 防误触从对话框打开时起算（FT-11）。
- 新建 worktree 时拒绝符号化的 remote-tracking 起点（FT-12）。
- 代码块 run 只在 idle 时视为结束（D20，按官方，本地 `exit` 不算），已写入差异说明。
- 面包屑 view、文件树官方行类、Changes 树、终端窗格接线、标签溢出行、Review 发现卡排在 R3。

### 转写区

- 回合页脚按下态（TT-04，已用真实层叠测试验证）。
- Shift+Tab 不在 keydown 时立即释放跟随（TT-05）。
- 键盘打开右键菜单时首项高亮（TT-06）。
- 附件文件名按 2–4 行自适应截断（TT-07）。
- 图片菜单的键盘入口。
- 转写骨架升级到 Ob。

## 蓝色字符背景（home-18）：未完成

- **源码已定位**：2.42304.0 新增的 `LandingTextureLayer`，位于 `c9d397622-Ddkc2XHN.js`，有 74 个绑定。宿主侧是 `cc43287c9` 的 `fH/pH/mH`，背景动画偏好在 `c67494563`。
- **已原样抽取**：生成器是 `extract-landing-texture.mjs`，产物 9 个模块 / 129 个绑定，有 18 项测试，包括三条 WebGL2 拒绝路径，不会伪造渲染成功。
- **还没挂载**：挂载的前提是 start card 和环境栏都已换成带 `[[data-landing-texture=canvas]~div_&]` 类的官方变体。start card 已满足，环境栏在 R3 做。
- **满屏蓝色的成因**：源码里只有 tap 波纹是蓝色的，确切成因还需要运行时确认。台账状态保持 `partially-implemented`，没有自己画一个背景冒充官方实现。

## 台账

R2 入账后共 344 条（原 334 条，加上 R2 新增的 10 条）：

| 状态 | 条数 |
|---|---|
| source-verified（宿主代码直接来自官方生成物，且有测试覆盖） | 27 |
| implemented-with-host-adapter | 41 |
| partially-implemented | 24 |
| not-applicable-host | 1 |
| pending-source-audit | 251 |

待审计的 251 条里，有 216 条不在任何调研工作项中。这 216 条来自对**更早一版**（2.31226.0 → 2.37337.1）的审计，没有对照过 2.42304.0。R3 有 10 个只读审计代理逐条核对，给出官方位置和经 grep 验证的特征串，见 `reports/R3/audit-*.md`。

## 验证状态（R2 结束时）

- 构建通过，全部生成器 `--check` 通过。
- 全量测试：4101 项，4059 通过，35 失败，7 跳过。**相对接手基线，新增失败 0**，基线里的失败少了 3 条。
- 每条实施线都经过独立的只读复核：high 和已确认的 medium 发现都由修复代理处理了，复核结论写在各条线报告末尾。
- 宿主终验与新的源码指纹回执会在最后一轮完成后生成，旧回执里的指纹不能沿用。

## 不迁移项与宿主差异（摘要）

- **不迁移（D17）**：账号、组织、云端会话、遥测与埋点、GrowthBook 专有服务、Windows/Linux 专属 chrome，以及依赖 claude.ai 账号的分区（PR steward、Cloud sessions 等）。各报告的 notMigratable 节逐项写了原因。
- **待定**：
  - 预览开关命名（Browser+⇧⌘B 还是 Preview+⇧⌘P，D15）。
  - 官方文案里的 “Claude” 暂时保留原文（D23）。
- **差异举例**：
  - Codex threadSection 只同步组和成员，section 顺序和视图只存在本地。
  - 跨窗口的 /btw 自动未读仍按主进程 layoutSessions 判断。
  - 本地 dedicated 模式的 `exit` 不算代码块 run 结束（D20）。
  - 全部差异以各条线报告的「宿主差异」节为准。

## R3（进行中）

runId `wf_d35fd23c-485`，2026-10-17T02:00Z 启动。共享前置是 view-tabs 补语义名，以及 source-menu 原语（ReactNode 禁用原因、header 槽、context guard 改为按官方位置 opt-in）。实施线包括：sections 布局与菜单、嵌套会话与 /btw、composer（环境栏、row chin、外壳、/copy）与蓝色背景挂载、首页环境菜单、文件与面包屑与 Changes 树、终端、标题栏、工具卡与分屏、全局 reset 层级、会话循环与批量确认。另外补做 R1 遗留的 3 个复核，并对 216 条台账做只读审计。结果出来后更新本节。

## R3b（已完成，和 R3 并行）

runId `wf_b60ca893-614`，02:55Z 启动，04:48Z 完成，11 个代理全部成功。只处理 R3 没有条线负责的 4 个区域，每条都先在 2.42304.0 里重新定位，再动手：

- **预览**：
  - 端口策略按官方主进程原码迁移：从配置端口往上扫 20 个，脚本写死端口时不改派，Run 时可停掉同文件夹的冲突服务器。
  - 就绪后做服务器身份校验（原生的 lsof/ps 适配）。
  - 预览分区的 User-Agent 规则。
  - 端口预留与释放。
  - 拾取不可用时自动取消。
  - 标签数上限为 8，带 sr-only 说明。
- **任务**：
  - Scheduled 页改走官方页壳。
  - Plan 评论框按住 Escape 的处理。
  - `/subtask` 的命令注册、解析和执行模块。按 D29 默认关闭，见下。
- **转写/工具卡**：
  - 流式表格列宽（来自官方生成物，有受控测试，记 source-verified）。
  - 行级崩溃边界。
  - 「Session not found on disk」空态。
  - Turn edits 卡的 See all 形态。
  - 读取拒绝的上下文。
- **设置**：
  - 磁盘空间不足提示。可用空间由主进程 statfs 真实查询，不是写死的数。
  - Worktree location 说明文案。
  - 快捷键字形间距核对。

主代理整合时的修正：

- **新会话被误判为「找不到」（已修）**：内核对没有 rollout 的新会话也回 “not supported yet”，原接线会把刚建的空会话显示成「Session not found on disk」并带 Delete。现在只有内核记录过首条消息、却列不出历史时才这样判，新会话仍显示 No messages yet。有模型级测试。
- **D29**：官方 `/subtask` 受主进程 GrowthBook 开关控制，且只对 Anthropic 账号开放。宿主两者都没有，所以默认关闭；手动输入 `/subtask` 会得到官方的拒绝文案。
- **D30 与台账下调**：
  - 「宿主不适用」只用于宿主确实没有这项能力的情形。Code 模式 Routines 页现在只是占位页，挂在它上面的 2 条改回待办，并新开 `tasks-code-routines` 条目。
  - composer-06、transcript-03、transcript-v01 下调为 partial：分别是缺父会话回报、CSS 变量没有消费方、只覆盖了 Message 行。
- 打包测试的文件清单补上预览新引入的生成物。这条测试要在宿主上验证。

台账（R3b 入账后，345 条）：source-verified 28、implemented-with-host-adapter 56、partially-implemented 30、not-applicable-host 6、pending-source-audit 225。

## R3v、R4a（已完成，与 R3 并行）

- **R3v**（`wf_c2b2c422-870`）：R3 审计建议把 129 条判为「宿主不适用 / 不可迁移 / 上游已删」。R3v 用只读代理逐条尝试反驳，复核官方特征串次数和宿主能力；证据不足的记 unresolved，不默认确认。几处跨批次结论不一致（iOS Simulator、SSH），由主代理直接查主进程门控后统一（D31）。审计加 R3v 共入账 150 条，另新开 6 个父条目：env-ssh-remote、layout-session-rail、toolcards-mcp-apps、tasks-proposal-group-card、cowork-session-actions、transcript-session-error-boundary。
- **R4a**（`wf_fc8c0e99-50c`）：给 45 条「候选已对齐」写测试锁定，每条同时断言官方特征串和本地等价行为。结果：25 条带宿主适配地实现，2 条源码已核实，11 条宿主不适用，7 条写测试时发现其实没对齐（大 diff 折叠阈值、已归档会话终端仍可附加、标题栏开关按下态、权限模式分层解析等），测试钉的是当前差异，转 R4。测试暂放 `app/tests-r4a/`，R3 门禁之后并入 `tests/r4a-*.test.mjs` 再入账。
- **R4r**（`wf_5306ba51-87b`）：对 4 块大功能做只读调研，产出 `analysis/code-ui-migrate-20261017/research/r4-*.md`：Session rail、提案组卡、会话错误边界与重试、Code Routines。

## R4e（已完成，与 R3 收尾并行）

runId `wf_cfe85342-7ce`，08:15Z 启动，09:39Z 完成，17 个代理全部成功。只碰 R3 里已经结束的线的文件，7 条线 16 个台账条目：

- **缩放菜单**（menus-14、layout-16）：Zoom In/Out 到上下限时变灰，判定函数从官方主进程原样抽取。
- **终端**（terminal-14、terminal-17）：未知 tab 的文案对齐官方；残留命令按官方 macOS 实际路径处理（^C → SIGKILL → 关闭并提示重跑），不再一直拒绝后续命令。用户手动重启过的命令标签归用户，不会被下一条命令中断。
- **预览**：端口失败卡直接显示主进程原文；preview_start 三种结果文案；身份校验失败写日志；截图后坐标过期时报官方错误（preview-15）；+ 槽位复用 SourceTooltip。
- **小修**：Select 吞掉重复 Escape（global-12）、查找跨图标连成一段（cov4-03）、routine 表单链接用官方类（global-13）、已归档会话的终端不能附加选区（terminal-05）。
- **插件详情**（settings-14）：最前面加 Overview 标签，Permissions 标签只在有工具权限服务器时出现（宿主无 GrowthBook，恒不出现）。
- **命名环境分支检查**（home-15）：起始分支不存在时按官方清除并警告；检查期间的提交先排队，检查结束再放行或丢弃。
- **发现卡**（toolcards-18）：ReportFindings 渲染为官方发现卡，类别徽章截断加 tooltip。卡片和 Changes 面板暂时还是两套状态（R4f 处理）。

台账更新已备好（16 条），入账顺序是 R3 → R4a → R4e。

## R4f（已完成）

R4f 共 29 个代理，0 失败。13:40Z 前后，R3、R4a、R4e、R4f 都已入账。完成的内容：

- **Session rail**：Code 会话右侧的 rail 面板按官方 presets 开分支挂载，包括原语、视图、分区、Changes 行四个生成器，以及本机会话元数据、标题栏开关和 rail 模式下的标题栏 lead。旧的 SourceGitRail 已退役。Connectors 卡、Context 卡、PR 行、Save environment 另开子条目，还没做；lazy worktree 按 D38 走官方关分支。
- **提案组卡**：转写区里内联的提案组卡替换了悬浮的建议卡，包括 Start / Start all / Options 弹层 / {count} started；主进程记录 spawnedFrom 和提案结果。
- **会话错误边界与重试**：会话加载失败显示官方错误页；错误卡 Try again 按官方发 nudge，不再重发原输入；额度重置后自动继续发官方文案。
- **其他**：view-tabs 补了 10 个语义名，R3b 的替身换回原件；发现卡和 Changes 面板共用一套评审状态；预览的 Retina 截图坐标换算；弹出窗格的 Add to prompt 会先让主窗口上屏。

## 外援调研与复核（research-ext/）

- 第 1 批 X1–X7 是只读调研，覆盖 MCP App、Cowork 会话操作、蓝色背景成因、证据不足的条目、lazy worktree、SSH 评估、「部分实现」缺口。用户据此裁定了 D34–D39。
- 第 2 批 Y1–Y3 是只读复核：Y1 对 R3、R4e 落地代码做对抗式复核，Y2 核查台账声明，Y3 审计中文覆盖。由此直接修了几处：
  - 首页 start card 从未渲染。
  - 补了 466 条中文。
  - i18n 测试改为按 ICU 结构比较占位符。
  - 构建 OOM：每个生成器校验改为独立子进程。
- 用户另外裁定了 D40–D42：「Where … runs」作为 D23 的例外；⌥↑/⌥↓ 和「按状态分组」保持开。

## R4g、R4h（交给其他会话执行）

- **R4g**：Code Routines 页、MCP App / Visualize、composer 外壳剩余部分、文件查看器与 diff 折叠、/btw 跨窗口与共享审批卡、turn box、侧栏拖拽、标题栏与草图画布等小项。见 `analysis/code-ui-migrate-20261017/handoff/r4g-continue.md`。
- **R4h**：Y 批里不和 R4g 撞文件的问题，涉及终端、发现卡、预览失败卡、回合尾部与菜单 tooltip、⌥⌘A、侧聊 Escape、接线行为测试、GUI 脚本选择器、intl。见 `handoff/r4h-continue.md`。
- 两边都只交回报告、`ledger-updates.json` 和 `STATUS.md`。门禁和入账由主会话统一做。

## 台账（R4int 之后，358 条）

| 状态 | 条数 |
|---|---|
| implemented-with-host-adapter | 141 |
| source-verified | 31 |
| partially-implemented | 23 |
| not-applicable-host | 131 |
| pending-source-audit | 32 |

