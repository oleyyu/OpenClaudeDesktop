# Code 侧边栏徽标、状态与标题追加对齐

目标是本机 Claude Desktop **2.37337.1**。本轮继续按源码验证，未操作 GUI、截图比较、启动模型请求、打包或替换已安装应用。旧版备份仍保留。

## 已接入

- Projects 使用官方 `mG → Zo` 的中性、xs、compact Beta 徽标，连同原始 New / Preview / Upgrade 分支和密度计算一起提取。当前导航连接默认 Beta；账号首次发现的 New 分支仍未连接。
- 普通 Code 会话去掉左侧空闲圆点，Pinned 保留 Code 图标。活动状态移至标题右侧的控制槽，悬停、键盘焦点和菜单展开时让位给 More；Code 的 More 使用横向三点。
- 状态优先级运行官方 `shared-8 ah`；本地活动回合映射 responding，重试期间不显示上一回合错误。子代理权限归属于所有者会话，归档行不显示活动标记，当前 pane 不显示服务端未读。本地未读与手动标未读通过同一主进程元数据入口持久化。
- 状态点使用官方 `BE / aj` Pulse 的灰、警告、强调色和 `df-tab-dot-running`，错误形状沿用官方 `Nw / jw / Mw`。可见装饰为 aria-hidden，标题内保留一份状态公告；错误标题仍由本地引擎错误适配提供。
- 标题使用官方 `uE / lE / $T`，按真实溢出、装饰槽和菜单/拖拽状态控制渐隐与提示；ResizeObserver 由所属窗口共享并在卸载时释放。

新增七个生成模块：`cds-merge-props`、`cds-badge`、`sidebar-upgrade-badge`、`sidebar-nav-badge`、`sidebar-session-state`、`sidebar-status-glyph`、`sidebar-fade-label`。原始声明不改写；React、国际化、图标、类名组合、错误文案、工具提示和本地记录由显式宿主适配提供。当前导航没有互相冲突的覆盖类；通用 Badge 的类名覆盖能力不能据此宣称与官方 Tailwind 合并器全面等价。

## 新截图的接入范围

用户本轮提供的新首页截图中，最近环境 / Choose environment 已连接 `SourceCodeStart` 和保存的本地环境；Continue uncommitted work 已连接工作区 Git 状态与 composer 预填动作，出现条件由 `startSetupRows` 决定；Clawd 由 `SourcePet` 的原始动画资源和播放器实现。

满屏蓝色字符背景**尚未接入，来源仍未确认**。已有 `home-18` 审计没有找到对应渲染器代码；本轮再次检查当前首页挂载链和候选 canvas/字符流模块，未找到可确认的实现。不能将它声明为已移植的官方 CSS，也没有凭截图另写一个效果并冒充原实现。遵守只看源码的约束，没有转而检查运行中的窗口。

## 验证与边界

- 15 个侧边栏相关测试文件，175 项通过；包括状态竞争、所有者权限、归档、已选 pane、手动未读、徽标密度、原始 props 合并、Pinned/普通/嵌套行、状态公告、鼠标拖拽及溢出观察器。
- 首页现有测试另外复核环境卡片、未提交工作出现条件与原始布局算法，详见 `home-screenshot-source-tests.log`。
- 生产构建和 63 个当前 helper 来源校验通过；五份官方 CSS 仍只允许原有资源路径重写。既有大 chunk、i18n 与 current-chat 混合静态/动态导入提示仍在。
- 机器记录：`analysis/code-ui-unpack-20261015/source-migration/verification-sidebar-status-current.json`。

本轮没有把完整行组件视为完成。环境描述行、PR 聚合计数/图标/悬浮卡、原始全部行控制与账号实验分支仍需对齐；当前 PR 槽只沿用本地已有的 PR 状态与图标适配。未确认的背景和其余审计项保留未完成状态，整套前端没有宣称 1:1 完成。
