# /btw 子会话源码核对（2.37337.1）

本轮仅查看安装包和本地源码、运行测试与构建。没有打开 Claude/OpenClaude 图形界面，也没有发起真实模型请求。以下是包内这条分支的行为，不代表当前账号的实验开关必定开启。

## 官方行为与宿主接口

| 部分 | 原始位置 | 已核对行为 |
| --- | --- | --- |
| 创建 | `index.chunk-BU5PdZBi.js` `lt`（readable:592） | 开关关闭返回 `disabled`；调用 `forkSession(parent, child?, undefined, undefined, {userFork:true, btw:true})`；明确拒绝时退回浮动侧聊。 |
| fork | `index.chunk-BolytlRP.js` `forkSession`（24784）、`registerForkedSession`（25135） | 复制父转录，独立持久化子会话；不要求父会话空闲。`btw` 使用父工作目录，不另建 Worktree；继承模型、权限和环境等会话设置。 |
| 关闭 | `index.chunk-BU5PdZBi.js` `ut/ft`（617/628）、`BolytlRP` `isSettledSideSession`（80460） | 只处理附属的 `btw + sideSession + userFork`；未归档且已 settled 才自动归档。运行、启动中、审批和未完成后台工作不能当作 settled。 |
| 主线程回报 | `index.chunk-DPv6qSYD.js` `Py`（10415） | `userFork && btw` 明确不自动回报主会话；普通 `userFork` 分支则会回报。不能把两条路径混用。 |
| 打开与发送 | `c73f45bc3-CzBat94I.js` `Ns/Ps/Fs`（readable:约 1300–1647） | 20 秒创建超时；迟到的子会话清理；父会话/账号变更保护；问题发送与当前显示位置分开；失败可恢复草稿或回退浮动侧聊。 |
| 页签 | `cccc2cf0a-CTtFjPG4.js` `MT/NT/FT`（约 13551–13738） | 多个侧聊按创建时间排序；运行或发送中的页签不能关闭；切换/关闭恢复焦点。不是单个辅助回答卡。 |
| 子窗格 | 同文件 `LS/zS/qS`（10448–10735） | 空草稿、子转录、自有输入框、审批、停止、续问、独立草稿和 `ownRowsSince`。当前安装包没有 `prestartBtwChild` IPC，不能假定预启动分支可用。 |
| 标题 | `c73f45bc3` `Ko/Jo` + `shared-2` `ZF` | `btw: ` 前缀、空白合并、60 个 UTF-16 单位边界、按字素安全截断；续问命名排除 `>` 引用行。原函数已经提取，未重写算法。 |

桌面端四个模块的只读副本、选定函数与 SHA-256：`analysis/code-ui-unpack-20261015/source-migration/btw-desktop-source/manifest.json`。前端原函数来源由 `app/src/generated/code-current/manifest.json` 记录。

## 本轮已接入的部分

`app/electron/btw-sessions.cjs` 是本地 Codex 协议适配，不是官方会话管理器的逐字复制。`main.cjs` 的 `btw-session` IPC 提供 `start/close`：

- 独立持久化 fork；父会话运行时仍允许创建；不停止、恢复或发送消息到父会话。
- 一次打开的请求 ID 去重；同一父会话可并发创建不同侧聊。超时的创建请求保留不确定结果，避免重试重复 fork。
- 校验实际连接和 epoch、已知活动父会话、权限及组织 Bypass 限制；暂只支持本地 Codex，其余内核返回 `disabled`。
- 子会话获得独立 app-tools 身份，保留父模型/环境/额外目录等元数据；保存先于可失败的重命名。连接更换后的已确认 fork 仍保留，但不向替换内核发布。
- 关闭时锁住子会话的发送入口，重新读取忙碌状态、审批及后台任务；无法确认后台任务空闲时保留会话。不会停止运行中的子会话。
- 子 turn ID 单独记录，窗格只显示子会话自己的内容，不把继承的父转录重复展示；记录在重启后保留。
- 使用当前官方 `Ko/Jo/ZF` 生成标题。重命名失败仍返回已保存的子会话与警告。

## 子窗格接线与本轮验证（2026-10-16）

本地 Codex 现在声明 `btwChildSessions`，主窗口 `/btw` 入口转向 `session` tile。其他内核和明确拒绝创建的分支继续使用浮动侧聊。`layout-08` 从 `pending-service-adapter` 更新为 `partially-implemented`，没有标记为完全一致。

- `btw-pane-controller.mjs`：裸 `/btw` 切换窗格、优先恢复最近未归档的侧聊；20 秒创建期限、迟到子会话清理、并发问题分别发送但只显示最新打开的页签；关闭等待最多 3 秒。关闭后重新读取列表并记住已确认归档结果，避免事件到达前复用已归档会话。
- `use-btw-pane.jsx`：子会话单独读取/恢复转录、续问和停止；RPC 固定到原连接 epoch。模型与 effort 来自子会话元数据或恢复结果，不读取主输入框或首页模型默认值。Auto 与沙盒网络设置沿用已有权限政策。
- `source-btw-pane.jsx`：独立转录、审批和内嵌 composer；多页签按创建顺序显示，运行或发送中的页签不能关闭；每个子会话的草稿和选中页签可持久化。首次提示通过已有隐藏 reminder 渲染路径过滤。
- `SourceComposer` / 审批快捷键：焦点在子窗格时，Escape 和审批键不能操作主会话；子 composer 不渲染主会话的底部环境/模型栏。
- 原始桌面 `Py` 及其字符串依赖由来源脚本直接提取，首次确认接受的 turn 消费 `boundaryPending`，失败仍保留。全局自定义提示启用时不插入默认提示；确认接受后的元数据写入失败不会伪装成发送失败。
- 主进程关闭前检查其他窗口是否正在展示该子会话。分屏/已知弹出窗口内显示的子会话不自动回收。此检查不等于完整多窗口窗格协议。

`btw-pane-tests.log`：12 个文件，139 项测试通过；覆盖控制器时序、SSR、模拟 RPC、审批键归属、权限和模型继承、原有浮动侧聊及布局回归。`build-btw-pane.log`：生产构建与 48 个当前来源模块校验通过。新旧 5 份 CSS 逐文件校验，仅允许资源 URL 前缀变换。完整机器记录为 `verification-btw-pane.json`。没有 GUI 测试或真实模型调用。

## 仍待对齐

后续共享页签接线已完成：原始 `we` 组件及依赖直接提取，共 11 个模块、1530 个声明，包含溢出、RTL、Base UI 焦点与菜单处理。官方 `/btw` 的 `FT` 调用不启用排序，现保持这一行为。父会话保持页签 header 实例，当前已归档页签仍显示，关闭后优先选择可用的相邻页签。13 文件 147 项测试通过，详见 `docs/view-tabs-source-20261016.md` 和 `verification-view-tabs.json`。

窗格已接通，但以下仍非完整官方实现：原生 Plan 待确认时的关闭/归档生命周期，完整窗口拖出/恢复/去重协议，来源组件的全部转录与交互分支，以及官方各实验/账号开关。入口焦点时效的原始 helper、Plan 输入区显示和原生实施卡/子会话权限切换在后续阶段已接入，见 [焦点与 Plan 接续](btw-focus-plan-source-20261016.md)。

后续的运行中 Queue/Steer 文字主路径已接入，见 [子会话 Queue / Steer 接入](btw-queue-source-20261016.md)：独立队列、当前连接绑定、停止后的未送达文字恢复，以及 197 项回归和生产构建均已验证。附件和全部新版队列展示分支仍未完成。

未验证完整官方拒绝条件、启动锁、Remote/WSL、额外 Worktree 布局、SDK/CLI 会话限制和所有服务端实验组合；本地 adapter 的连接隔离、忙碌判断和数据协议也不等于官方运行时。这些差异继续保留在迁移台账。
