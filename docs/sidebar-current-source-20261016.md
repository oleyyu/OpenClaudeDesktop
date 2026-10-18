# 新版 Code 侧边栏：搜索、列表范围与分组菜单

目标版本仍为本机 Claude Desktop **2.37337.1**。本轮只读官方源码、执行模拟 DOM/事件及 SSR 测试和构建；没有操作图形界面或发起模型请求。上一轮 Plan 关闭与恢复属于有效进展，本轮继续处理侧边栏的独立差异。

## 原始代码与接线

新增五个原始提取模块（声明内容不改写，依赖通过宿主适配），并纳入构建来源/输出校验：

| 原始文件 | 声明 | 用途 |
| --- | --- | --- |
| shared-18-DScmD_-G.js | IT / GT | 焦点样式与可作为按钮/链接的行原语 |
| shared-21-DExJa6Im.js | rI / iI | 搜索入口布局判定与 Search 字段 |
| shared-16-BxEk65IO.js | ku / Au / ju / Pu / Fu / Iu | 真实菜单行登记、空组省略、分隔线与 group/presentation 语义 |
| shared-19-SWo9Ge1k.js | GJ / KJ | new → open → edit → share → organize → settings → view → staff → panes → remove 的组顺序 |
| shared-19-SWo9Ge1k.js | dY / fY / pY / mY / hY | 当前列表的全部折叠/展开、可见性与焦点恢复 |

Search 采用用户截图所示的 fieldAboveNew 分支，调用默认命令面板，使用 `cmd+k` 的平台表示。原始组件保留鼠标按下不抢焦点、行语义、快捷键显示、宽度/间距/圆角与焦点类；图标、国际化、快捷键及打开动作接到现有本地实现。未接入 Anthropic 的账号或 GrowthBook 状态。

按 `_j → EE → HZ → JA` 的结构，New 在滚动区外，Projects / Artifacts / Routines / Customize 位于滚动区顶端，真正的会话列表单独包裹 `.df-session-list`。搜索和 New 共用滚动条补偿。这样原始 CSS 的导航 26px、普通 Code 会话 28px、桌面 Pinned 26px、组间距 8px/Pinned 9px、nav-pin-rows 底部 10px 作用于正确节点。补齐 `data-group-caret`，让原始触屏规则生效。行尾按钮使用原始 `--df-row-ctl-inset`，组标题使用原始 label inset 计算。

Code 空白区菜单接通 New session，custom 分组下接通 New group… 和已有持久环境编辑器的 New environment；随后是 Select all 和按当前 DOM 判定的 Collapse all / Expand all。文件夹与自定义组菜单使用原始 KJ 分组，缺失的组不会留下分隔线。

原始 hY 会在同一事件里点击多个 toggle，因此宿主用同步 preference ref 累积每次点击，避免 React 批处理时只保存最后一个分组。折叠时只在原焦点消失且没有新的实际焦点时，恢复到其前面最后一个可见 toggle。inert 分组不参与，弹层用自己的 ownerDocument 判断。

## 验证与未完成项

14 个相关测试文件共 **164 项通过**。测试执行原始搜索、原始组计数/挂载清理、原始折叠函数和本地侧边栏事件，覆盖布局作用域、快捷键、空白区动作、文件夹/自定义菜单、同事件多次更新、inert 排除与焦点竞争。生产构建与 56 个当前 helper 来源校验通过；五份官方 CSS 保持原文件，仅允许既有资源路径重写。

完整结果见 `analysis/code-ui-unpack-20261015/source-migration/verification-sidebar-current.json`。这轮将 sidebar-01/02/03/04 记录为已接入宿主适配，将 sidebar-09/10 的样式作用域记录为源码验证通过；并不代表整个侧边栏或整个应用完成。

账号/实验分支、环境分组与其专属菜单、导航徽标/提示点、描述行/状态的完整原语、批量生命周期与后代确认等仍需进一步核对。例如 Projects 的官方默认 Beta 徽标及首次发现分支尚未接入。跨窗口和其他区域的未完成项仍保留在总账中。没有像素或真实窗口验证，旧版备份保持不变。
