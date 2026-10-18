# Claude Code Desktop 2.37337.1：源码迁移进度

目标仍是新版 Code UI 的 1:1 迁移。当前已完成下面的默认主路径改动；**不能把本文件或构建通过视为全部 334 项差异已完成，也不能称整套前端已完全一致**。

本阶段遵照“只看源码”：依据本机 2.37337.1 的文件和调用链修改，使用纯函数测试、服务端静态渲染与构建验证。没有操作 Claude 窗口，没有截图或运行界面验收。

## 已接入的源码

`app/scripts/extract-code-start.mjs` 从 `cc43287c9-CNtlFMhj.js`、`c0fbbe82d-DClNgk7g.js` 提取 49 个原始 binding，生成到 `app/src/generated/code-start/`。保留函数体、DOM、className 和文案；React、国际化、tooltip/button/icon、本地数据存储由显式 host adapter 接入。官方遥测回调为空操作，不影响渲染。

`app/scripts/extract-code-ui-current.mjs` 最初直接提取以下 7 个辅助模块，生成到 `app/src/generated/code-current/`（本轮扩展到 15 个，新增项见下文）：

- Tab 焦点移出视口时解除底部跟随：主对话和子代理视图共同使用。
- 文件树的 10px 缩进、指引线位置、方向和单线渐变。
- 按会话与文件路径记忆视图状态的 32 项缓存。
- 终端附加选区文本整形，保留首行缩进。
- 终端标签描述，正确处理 `~`、`/` 和 Windows 路径。
- OSC 133 命令标记，终端 `reset` 清理旧标记。
- 输入法 composition edge guard、临时字符清理和粘贴前结束组字。原始 ProseMirror 插件使用本地编辑器实例；Tiptap 注册和遥测是显式适配。

`app/scripts/extract-code-editor-current.mjs` 另将新版 CodeMirror 核心、解析器及依赖的 28 个模块原字节复制到 `app/src/generated/code-editor-current/`，提取新版 wrapper、文件名映射、主题、换行和按键处理。所有编辑器使用同一个新版核心实例，原来的编辑器核心不再接到 Files 编辑视图。

三个生成器均支持 `--check`：重新从安装包快照生成并逐文件比较，来源 SHA-256 和生成文件 SHA-256 记录在各自 `manifest.json`。`prepare-ui.mjs` 每次构建强制检查。

## 本地接线与行为变化

### 首页

- 用官方 `b$/BQ/VQ/p$` 替换手写简化卡片。
- 最近环境最多三项，选中项不在前三项时替换第三项；保留官方稳定排序 hook。
- Next steps 按类别合并，显示 `and # more`，按优先级最多显示三类；不再额外画一个可见的 Next steps 标题。
- 等待用户输入的会话包含置顶会话；不复用旧 Action Center 排除置顶项的筛选。
- `startCardDismissals` 持久化、stamp 改变时重新出现、最多保存 100 项，并同步到其他窗口。
- 保留官方悬停/焦点时固定当前行、关闭后的焦点恢复和 500ms 防误点逻辑。
- 保留官方 `eV/tV/iV` 测量与高度不足时隐藏辅助行的逻辑。局部 CSS 只挂载滚动区域并解除旧全局 button reset 对官方 utility layer 的覆盖。
- 本地接入选择目录、其他会话在同目录运行时建议 Worktree、失败会话继续入口、非默认分支的未提交工作和建议任务。
- 打开额外面板时收起首页卡片，并保留输入框下方的任务 chip 分支。

### Files

- Code Files 中 HTML 默认显示源码，仍可切到 Preview；其他直接使用查看器的表面保持其自身默认值。
- 视图按会话与文件路径隔离；换标签恢复非默认源码/强制文本状态，切换会话不串状态。
- Create file 成功后进入源码；空 Markdown 预览显示空文件卡。
- 更新空文件、二进制、CSV 错误卡和 Auto save 文案。
- 首次加载自动展开单子目录链（最多 16 层）；用户已经做出的展开/折叠选择优先。
- 树缩进为 10px；选中或当前打开文件的祖先指引线常驻，并使用逻辑方向样式。
- 空 frontmatter 不再吞掉后面的 Markdown 分隔线和正文。

### 侧栏、终端和对话

- 侧栏空白菜单调整为 New group / Select all / Collapse all、Expand all；移除空白菜单旧的批量归档/删除入口。
- 组菜单增加全部折叠/展开和归档组内可归档会话，重排 New group、Rename、排序和删除项。
- 折叠的嵌套会话显示失败计数；归档快捷键跳过置顶或运行中的会话。
- 单窗点击当前会话时聚焦 composer 并把光标放到末尾。
- 终端有选区时不误开网页或文件链接；行编辑快捷键先滚回底部。
- 主对话和子代理视图使用官方 Tab 焦点释放 helper。

## 验证

- 16 个相关测试文件，196 项通过，0 失败：`analysis/code-ui-unpack-20261015/source-migration/regressions.log`。
- Tab 焦点 helper 的独立事件测试 3 项通过：`source-migration/tab-focus.log`。覆盖视口上方焦点、浏览器自动滚动补偿、取消/修饰键 Tab、焦点 guard 和监听器释放。
- 文件查看器最后一次修改后单独复跑：`source-migration/file-viewer-final.log`。
- 源码生成器逐文件校验通过；生产构建见 `source-migration/build.log`。
- 未运行界面测试；源码测试无法证明所有窗口尺寸和运行状态的像素一致性。

## 编辑器与输入法追加迁移

- 复制整行使用新版原函数：合并相邻选区、保留多光标位置，标注 `input.copyline`。
- 活动缩进指引线使用官方分块计算、活动范围和 14% / 40% 默认颜色；支持主题提供活动指引线颜色。
- 主题样式、搜索高亮和跳转行采用新版原始主题函数；随用户选择的亮／暗代码主题更新。
- Attach selection 跳过仅含空白的主选区；加入新版本 `.env`、`.cfg`、diff/patch 与 ignore 文件解析。
- 外部文本更新使用最小替换范围，保持未受影响的光标，处理折叠边界，更新换行设置并清除旧文档撤销历史。
- Escape 释放选区后抑制长按重复；macOS Tab 焦点切换兼容物理 KeyM；文件代码区保持 LTR。
- 中文组字开始于 `inclusive:false` 的链接边缘时，原插件插入临时字符并在结束后清理。粘贴前结束组字，Android 保留原生行为。
- 建议任务标题限制六行，摘要有值时六行，否则提示词限制三行。

追加验证：`source-migration/editor-composition-final.log`，10 个相关测试文件、68 项通过，包括新版核心、28 个模块字节一致性、语言加载、真实文件保存、撤销、折叠、多光标、主题与 IME。验证过程只使用源码、状态模型和模拟事件，没有打开图形界面。

## 上一阶段验证

- 主界面相关 32 个测试文件：264 / 264 通过，见 `analysis/code-ui-unpack-20261015/source-migration/ui-final-regressions.log`。
- 编辑器／输入法相关 10 个测试文件：68 / 68 通过，见 `editor-composition-final.log`。两组共 332 项，无失败或跳过。
- `npm run build` 通过，见 `build-final.log`；49 个首页 binding、7 个辅助模块及 28 个新版编辑器原始模块通过来源校验。构建仍有既有大 chunk 和混合静态／动态导入提示。
- `git diff --check` 通过。本阶段未重新运行全仓库测试，不能将此前记录的全仓库既存失败改述为已修复。
- 机器可读结果及构建源码摘要：`analysis/code-ui-unpack-20261015/source-migration/verification-final.json`。

## Files、会话菜单与 @ 产出候选追加迁移

本轮继续只依据源码、状态测试和 SSR，没有打开图形界面。

- 图片预览载入后，右键菜单隐藏路径 Copy 子菜单，尾部显示 Copy image。复用本地已经使用的图片像素转 PNG 与 Electron clipboard IPC；失败显示原版错误文案。路径或预览内容变化后不会继续复制旧图片。
- 下载使用原始 `xu/Su/Ou` 解码判断和 `FO/OO` 文件类型规则。正常文本按 `application/octet-stream` 下载；替换字符确实源于解码损失时才显示警告，原文合法的 U+FFFD 不误报。受损二进制源码只在可读取原始 Office/PDF 字节时提供下载。新增 IPC 保持文件夹与真实路径检查，原始读取失败不回退成受损文本下载。
- 文件头、正文和编辑器菜单统一显示下载中禁用状态。文件读取保留字节数，避免仅凭 `�` 判断编码损失。
- 面包屑文件列表按鼠标／键盘激活分别打开预览／固定标签；查找输入保留 IME `keyCode === 229`，关闭查找、跳转行和清空多选后采用原版 `gY` 抑制 held-key repeat，按键释放后恢复。
- 单会话、多选和标题栏共用菜单按 open / edit / share / organize / settings / remove 分组；使用 `role=group`，只在有内容的组之间加分隔。Fork 移到 Rename 后，分享和 Export 独立成组，Move up/down 进入整理组。
- 直接提取 SDK 的 `FileIndex` 和 `Hj/Bj/Yj` 候选合并函数；主输入框和侧边提问共用。空查询保留原结果；有查询时先匹配产出文件名，再与索引候选合并、去重和重排，上限 50。菜单按 shownPath 高亮，插入内容保留实际路径。
- 产出记录的宿主适配使用本地已完成的 fileChange 和 SendUserFile／显式 deliverables；官方 `hf` 保留最近顺序、文档扩展名和临时目录过滤。相对路径、工作目录／来源目录、附加目录、`/private/tmp`、Windows 与 home 缩写按本地记录接线。该适配不是 Anthropic 原生转录协议的直接复用。
- 修正先前首页中文 ICU 字符串的分支结构，使字典占位符检查和实际格式化使用一致。

新增原始辅助模块：file-document-types、file-text-decoding、file-index、mention-output-files、file-output-root、file-output-normalize、file-output-paths、file-output-order。三个生成器仍在构建时逐文件检查；目前为 49 个首页 binding、15 个辅助模块、28 个原始 CodeMirror 模块及 5 个编辑器 adapter。

本轮最终验证：23 个测试文件，**191 / 191 通过，0 失败或跳过**，见 `analysis/code-ui-unpack-20261015/source-migration/files-mentions-final.log`。生产构建通过，见 `build-files-mentions-current.log`；既有大 chunk 和混合动态／静态导入提示仍在。`git diff --check` 与 Electron 文件语法检查通过。

本轮机器结果：`analysis/code-ui-unpack-20261015/source-migration/verification-files-mentions.json`。逐条续查台账：同目录 `migration-status.json`，基于原 334 条保留 ID；未在该台账复核的条目明确标为 `pending-source-audit`，不代表此前毫无实现，也不能算已经验收。

## CSV、路径栏、文本解码和侧栏聚焦追加迁移

本轮仍只检查源码、模拟事件和 SSR，没有打开图形界面。

- 将 `cd5fd9055` 的 CSV 视图、数字／日期分类、稳定排序、整行筛选，以及 `c02d6193d` 的解析逻辑直接提取为当前模块；底层 `c63ad9d34` 的 csv-parse 与 Buffer shim 原字节保留。替换旧手写解析器和表格。保留缺失值集合、IP／版本号排除、货币和千分位处理，以及代理对安全的单元格截断。
- 加入官方 `c3fde7009-Bw3E3o9_.css`，仅将资源 URL 改为相对路径，来源哈希进入 `public/ui-provenance.json`。文档表格使用原始 `data-pane-line`、数字列属性、排序按钮、表格区域、行计数与上游截断提示。Code 文件默认启用 document CSV，其他直接使用查看器的表面保留 pane 默认。官方调用方的 reading 模式受 `__gb__1590565993` 控制；本地选择启用该模式，不能据此断言某个官方账号的开关状态。
- CSV 的 CDS 输入／按钮、国际化和延迟挂载调度使用显式宿主适配；原始 printable context 已提取，但未接入新的打印入口。排序图标按 xs 的 auto-sm 光学尺寸显示。中文新增文案保持 ICU 分支与占位符一致。
- 路径栏加上 `font-normal font-control`，按官方条件区分 toolbar 中的静态 div、可复制按钮和需要提示的按钮；无复制动作不显示复制 hover。复制标签和实际复制内容都使用完整路径。本地既有滚动面包屑仍待改成官方中间省略布局。
- 将 `gu/_u/yu/bu` 编码判断原函数提取到 Electron 打包保留的目录。UTF-16 LE/BE（BOM 或字节分布判断）和 Windows-1252 文件可正确预览；拒绝损坏混合编码和二进制内容，保留 encoding 元数据。宿主仍有 1 MiB 预览上限，编辑保存仍限定有效 UTF-8；非 UTF-8 预览不会被另一次 UTF-8 编辑读取覆盖。
- 侧栏点击按源码收窄：当前主 Code 会话的单击才移动 composer 光标到末尾，主窗在分屏已打开但仍聚焦主窗时也适用。额外面板聚焦、键盘激活与双击不请求该移动。复用原始 `Xt` 能力判断，包括 Electron 例外；分屏路由也关闭侧栏 peek。

本轮验证：30 个相关测试文件，**232 / 232 通过，0 失败或跳过**，见 `analysis/code-ui-unpack-20261015/source-migration/csv-decoding-focus-final.log`。生产构建通过（`build-csv-decoding-focus-current.log`）；49 个首页 binding、23 个当前辅助模块（含 CSV 原始 vendor 与 Electron decoder）、28 个新版编辑器原始模块和 5 个编辑器 adapter 均通过来源检查。仍有既有 chunk 大小和混合导入提示。

最后修正了宿主 button reset 对路径栏字重的覆盖，随后复跑 3 个测试文件、33 项全部通过（`csv-breadcrumb-style-final.log`），再次生产构建通过；`git diff --check` 和 Electron 语法检查通过。

机器结果：`analysis/code-ui-unpack-20261015/source-migration/verification-csv-decoding-focus.json`。这份结果只证明本轮列出的范围，不替代 334 项逐条验收，也不证明像素级完全一致。

## 2026-10-16：路径省略、环境布局与按钮按压

继续遵照“只看源码”，本轮没有运行浏览器或操作 Claude 窗口。

- 路径栏直接提取新版 `cd2efac6e` 的外层、目录段、文件名和上下文菜单接线，以及 `ce574895a` 的宽度测量／截断算法。长路径按宽度省略中间目录，保留文件名尾部；文件名按 Unicode 字素边界截断，避免拆开组合字符和 emoji。沿用每个窗口共享的 ResizeObserver、半像素容差和被省略节点的焦点恢复。
- 保留省略段的可访问完整目录名、路径提示、方向键导航和目录菜单。绝对路径经过宿主 lister 转回已有相对标签路径，避免打开同一文件时生成另一份标签；读取仍走现有工作目录检查。目录列表／弹层仍是本地适配，官方 query cache 预热与远程列表延时分支未迁移，不能据此称整个文件弹层完全一致。
- 本地环境变量表单使用 `c29df1c52 _/v` 的原始滚动区 class 和通栏 footer：`border-t`、`mt-auto`、`pt-lg`，内层 footer 取消旧顶边距。保存、密文存储及进程环境传递继续使用已有实际服务。
- 环境菜单设置按钮及辅助说明改用 `ca80fca8d tX/nX/rX/iX`，采用新版 `text-muted-control`、高亮／触屏显示条件和方向键。方向来源是显式宿主适配；当前本地两种语言仍为 LTR。该改动不代表完整命名环境／收藏菜单已实现。
- 共享设置按钮、审批按钮、消息动作按钮和长消息展开按钮接入 `shared-frame rs/is/cl` 原始按压计算：按按钮高度计算 0.5–1.5px 的内缩，测量装饰背景的宽高，分别写入横纵缩放值，下限 0.8。鼠标按下及首次空格按下时重新测量，保留重复按键保护与原操作回调。
- 快捷键表补上新版 `plus → +`，不会把 `cmd+plus` 显示为 `⌘ Plus`。
- Tooltip 的标题、辅助行、详情及禁用原因节点使用 `shared-frame mc` 原始结构签名作为 key：纯文本更新保留节点，标签、组件类型或 key 改变时重建节点。

主批次验证：24 个相关测试文件，**223 / 223 通过，0 失败或跳过**，见 `analysis/code-ui-unpack-20261015/source-migration/breadcrumb-environment-buttons-final.log`。Tooltip 变更后另跑 6 个相关文件，**75 / 75 通过**，见 `tooltip-structure-final.log`。最终生产构建通过，见 `build-breadcrumb-environment-buttons-current.log`。49 个首页 binding、33 个当前辅助模块、28 个编辑器原始模块及 5 个编辑器 adapter 通过来源校验；5 份新版 CSS 再次逐文件对比通过，唯一转换为资源 URL 前缀。构建保留既有大 chunk 和混合导入提示。

机器结果：`analysis/code-ui-unpack-20261015/source-migration/verification-breadcrumb-environment-buttons.json`。这些结果只覆盖列出的迁移范围，尚未完成整套新版 1:1。

## Saved Environments 本地分支追加迁移（2026-10-16）

本轮只读源码、执行测试及构建，没有使用 GUI。新建／编辑／删除／收藏／搜索／选择命名本地环境已经接入真实持久化、首页原始 StartCard 与 composer 环境按钮。保存和切换不会改动已打开会话的目录；新会话继续走宿主既有 Git 分支切换与 Worktree 创建流程，并保存环境 ID 和实际使用时间。

- 提取 `cd0cf5b5e` v4 记录校验、名称冲突、目录比较与设置拆分原函数。环境保存目录、附加目录、分支、Worktree；移除权限模式与自定义图标／颜色，模型和 effort 等会话偏好不混入 place settings。空设置允许省略。
- 提取 `ca690a791` 的 draft、dirty、target、分支排序／默认分支标签及弹窗高度保持 hook；`cd8823d73` 的目录组、目录行和名称截断视图；`shared-frame` 的当前 `qy/YE/XE/QE` 输入与字段绑定。脏表单保留 Keep editing／Discard／Save，删除确认说明已创建会话会保留，保存失败保留输入与错误。
- 菜单使用当前原始 `aX/tX/nX/rX/iX/uX` 收藏、设置、方向键说明和选中行属性。接入本地分组、收藏组、查询、新建、编辑以及全局环境变量入口。保留普通行与选中行不同的勾选占位。
- 环境变量采用官方支持的 `saveScoped=false` 分支，显示“适用于所有本地会话”并打开既有密文存储编辑器。当前宿主没有每会话环境变量通道，也没有附加目录独立 checkout 的启动能力；后者在保存／选择／启动时显式拒绝，未伪装为已支持。
- 宿主以 0600 临时文件加原子替换保存，串行处理重名检查和修改。快照带修订号，防止较旧 IPC 响应覆盖另一窗口的新选择。选择时验证目录存在；启动时按 realpath 比较实际目录／Worktree 来源，并在核心 RPC 前移除仅桌面使用的环境 ID。先等仓库信息再判断 Worktree，避免快速选中后立即发送落入普通目录启动。
- 公共弹窗、菜单／搜索、目录选择器、国际化和 class merge 仍是明确的宿主适配；source utility 被旧宿主 reset 覆盖的部分作了局部还原。此轮没有宣称这些基础组件的所有 DOM／交互分支均与官方相同。

15 个相关测试文件 **85 / 85 通过**；收尾改动再跑 3 个文件 **14 / 14 通过**。涵盖持久化与重启读取、并发重名、无效目录、收藏和删除、符号链接 Worktree 来源、原始字段 SSR、表单事件模拟及跨窗口旧响应保护。见 `saved-environments-final.log` 和 `saved-environments-followup.log`。曾在测试与构建同时使用 Vite 缓存时遇到 `ENOTEMPTY`；最终将它们分开并串行运行测试后通过。生产构建与来源核验结果记在 `verification-saved-environments.json`。

## 嵌套会话与 /btw Escape 追加迁移（2026-10-16）

本轮继续只使用源码、状态／事件测试与 SSR，没有打开浏览器或 Electron 图形界面。

- 从当前 `shared-21` 提取 `pz/gG/JQ`，从 `shared-20` 提取 `Q/YC/XC/ZC`，从 `shared-18` 提取 `Vv/Bv/KE/IT`。折叠摘要按失败、未读、运行中依次互斥计数，修复失败会话也计入未读的重复。可访问名称包含全部非零状态，英文复数／more 与中文使用同一 ICU 分支和列表格式化。
- 摘要改为新版单个渐隐容器、状态分隔符、未读点和警告装饰。数据来自本地实际错误、最新失败 turn、未读与运行状态；图标基础组件、文字溢出／提示、拖拽和导航仍有宿主适配。保留宿主 `label:*` 拖拽键，避免把摘要当作可重排会话。
- Code 家族的行背景与父行等宽，只在行按钮内部按 `--df-row-indent` 缩进。去掉 Code 的额外 18px 分组缩进与旧连线点击把手；折叠仍从父会话菜单操作，摘要可展开并恢复焦点。官方 `.df-family::after`、8px iconless pad 与 row stack gap 直接生效，不再叠加旧逐行连线或旧 gap。其他模式的旧样式仍限制在各自范围。
- 折叠保留当前会话、同一窗口的分屏会话、`awaiting`、`pendingPermissions` 和归属于主会话的子代理审批。待审核项目不能被折叠摘要遮住，保留顺序不变；窗口外的打开状态没有由本轮新增同步。
- 浮动 `/btw` 的 Escape 分支接入当前 `gY/_Y` 原始重复键保护。取消读取最新请求状态；已在取消时不重复发送或重复安装 guard。取消完成后继续按住 Esc，不会关闭面板或落到主会话；释放 Esc 或按其他键后恢复。IME、打开的提及／菜单／对话框继续由输入层处理。
- 当前 `cccc2cf0a LS` 的真正 `/btw` 子会话侧窗格仍未实现。它依赖 `btwChildSessions` 支持、独立子会话生命周期与转录服务。本地现有 `sideQuestion` 浮动辅助请求不等同该分支，台账 `layout-08` 明确记为 `pending-service-adapter`。

24 个相关测试文件 **216 / 216 通过**，最后的 class 接线后再跑 3 个文件 **52 / 52 通过**，见 `nested-btw-final.log` 与 `nested-btw-followup.log`。包含同一会话多状态去重、分屏保留、真实侧聊 store／异步取消、按键释放、IME、中英格式化和侧栏 SSR。最初直接用 Node 加载国际化 vendor 时碰到其 JSX 依赖，测试改用与生产一致的 Vite SSR 加载后通过；不是产品运行失败。

生产构建通过（`build-nested-btw-current.log`）；49 个首页 binding、45 个当前辅助模块、28 个新版编辑器模块和 5 个编辑器 adapter 通过来源检查。5 份新版 CSS 再次逐文件比较，只有资源 URL 前缀转换。保留既有大 chunk 与 i18n／current-chat 混合导入提示。机器结果见 `verification-nested-btw.json`，源码摘要为 `3e061ffe3555506cd524987fbbbc77e29a4a1f151eedb87f631597ce748418f9`。

旧 GUI 脚本仍含 2.2553.1 的连线把手等断言，本轮没有运行或将其作为验收证据。描述型会话行／under-glyph 变体、完整嵌套任务汇总和其余 side-chat 旧 adapter 仍待续查。以上结果不代表整套新版 1:1 已完成。

## /btw 独立子会话生命周期（2026-10-16，服务阶段）

继续按安装版本 2.37337.1 核对桌面服务源码，新增 `btw-sessions.cjs` 与 `btw-session` 的创建／关闭入口。主会话运行时可创建持久子会话，独立绑定 app-tools 身份；关闭仅在确认子会话已空闲时归档，审批、启动中的发送、后台任务或未知后台状态会保留会话。创建请求去重、超时不重复 fork、连接 epoch、权限与组织策略、元数据持久化、子 turn 归属均有测试。命名直接使用当前原始 `Ko/Jo/ZF`，本轮增加 2 个当前来源模块。

明确区别：官方 `/btw` 子会话不自动回报主会话，普通嵌套任务的回报机制不能直接复用于它。详见 `docs/btw-child-lifecycle-source-20261016.md` 和桌面源码哈希清单。

此服务阶段结束时，新窗格尚未接到入口、`boundaryPending` 尚未消费，`layout-08` 为 `pending-service-adapter`。后续接线见下一节。

验证结果记录于 `analysis/code-ui-unpack-20261015/source-migration/verification-btw-lifecycle.json`；测试日志 `btw-lifecycle-tests.log`，构建日志 `build-btw-lifecycle.log`。本阶段未操作图形界面、未发起真实模型请求、未提交或替换安装应用；不能据此声明整套 1:1 已完成。

## /btw 子窗格接线（2026-10-16）

主窗口已接入持久子会话的 `session` tile、页签、独立转录/续问/停止/审批与草稿恢复；仅本地 Codex 启用这条适配分支。首次消息使用提取的官方桌面边界提示，确认接受后消费标记；父会话保持独立。20 秒超时、迟到清理、关闭重开、并发打开、连接 epoch 与快捷键隔离有模拟测试。

12 个相关测试文件共 139 项通过，生产构建通过，当前原始来源辅助模块增至 48 个，5 份官方 CSS 再次比对。记录：`analysis/code-ui-unpack-20261015/source-migration/verification-btw-pane.json`。`layout-08` 记为 `partially-implemented`：页签溢出/排序、Queue/Steer、Plan 实施卡、完整多窗口协议和实验条件仍待对齐。详情见 `docs/btw-child-lifecycle-source-20261016.md`。整套新版 1:1 仍未完成，旧版备份保留，未提交或替换安装应用。

## 尚未完成

后续页签进度（2026-10-16）：`/btw` 已切换到原始共享页签组件及 Base UI/CDS 依赖，11 模块、1530 声明；原始溢出/RTL/菜单/键盘行为接入，调用处按官方 `FT` 保持不排序。13 文件 147 项相关测试与构建通过，见 `docs/view-tabs-source-20261016.md`。`layout-08` 仍部分完成，入口焦点时效、Queue/Steer、Plan 实施卡和跨窗口等未完成项保留。

- 原审计的 334 条必须逐项更新完成状态；旧审计中的 `needs-change` / `not-applicable` 是当时判断，不能直接当作本阶段验收结果。
- `generated/code-editor` 仍保留其他功能使用的旧 adapter（例如预览、side chat）；Files 编辑器核心、语言加载和主要 wrapper 已改接新版目录。
- composer 的 @ 产出候选与命名本地环境已接入；环境弹层基础组件、远程／云环境、每环境变量、附加目录独立 checkout 和其余条目仍须逐项核对。各内核的产出协议由本地适配，尚未证明所有协议分支等同官方。
- Files 的图片复制、下载替换字符提示、原始字节下载、查找／跳转和树多选按键保护已接入；路径栏静态态与中间省略布局、CSV 数字列和基本编码探测已接入；目录列表查询／弹层的剩余分支、文本读取上限、非 UTF-8 编辑及其余文件访问分支仍须核对。
- 会话菜单分组已接入；当前主会话单击聚焦已按分屏状态和输入方式核对；其余标题栏边缘状态仍未全面完成。
- PR/CI、远程/云环境、/btw、嵌套任务汇总、Recap 等需要单独核对本地服务和能力。本阶段没有添加没有真实数据/动作的占位按钮。
- 官方实验开关、账号策略和服务端文案不能仅凭包内源码证明当前账号的运行状态。

旧版备份仍为 `/Users/oleyyu/claude-ui-lab-backups/openclaude-0.2.186-before-ui-2.37337.1-20261015-194822/`，本阶段没有修改备份。当前改动保留在工作区，未提交 Git、未打安装包或替换已安装应用。

## 子会话 Queue / Steer 追加迁移（2026-10-16）

新版子会话的文字追加与队列已接入独立的本地协议适配：Enter 追加、Cmd+Enter 排队，支持取回编辑、删除、排序、清空与立即发送；停止后只恢复该子会话尚未送达的文字。异步操作绑定原连接，避免重连后误发。18 个相关测试文件共 197 项通过，生产构建及五份官方 CSS 校验通过。旧版备份仍保留。

源码依据、适配范围和未完成项见 [btw-queue-source-20261016.md](btw-queue-source-20261016.md)。整体仍未达到完全一致，`layout-08` 保持部分实现；本轮没有把其余审计项标为完成。

## 子会话焦点与 Plan 追加迁移（2026-10-16）

接入官方原始焦点意图/活动 pane 判定，保留 askedAt 跨异步创建并消费一次；子内容按会话挂载，header 保持稳定。Plan review 隐藏但不卸载输入区，并限制为普通接受和接受并允许编辑。原生 Codex 子会话新增 Implement/Stay 接续，确认成功后只改变子会话权限，旧连接结果不覆盖新的选择。51 个原始 helper 校验通过，21 个相关测试文件共 233 项通过，生产构建和五份 CSS 校验通过。

[本轮依据与边界](btw-focus-plan-source-20261016.md)：原生 Plan 等待确认时的关闭/归档仍需对齐，完整跨窗口、附件与其余服务分支未完成；整体目标保持未完成。

## 子会话 Plan 关闭与恢复追加迁移（2026-10-16）

上一阶段的原生 Plan 关闭缺口已补齐：自动归档前读取最新自有计划，未决或无法确认时保留子会话；Stay 保存到子会话元数据，并通过现有广播恢复到重新打开的窗格。固定会话、队列及读取期间的状态改变也会阻止自动归档。确认卡与页签关闭保护独立于发送状态。

依据、实现与验证范围见 [btw-plan-lifecycle-source-20261016.md](btw-plan-lifecycle-source-20261016.md)，最终记录见 `analysis/code-ui-unpack-20261015/source-migration/verification-btw-plan-lifecycle.json`。完整跨窗口流程、PR/后代级联归档、附件和其余条目仍未全部完成，整体 1:1 目标保持未完成。

## Code 侧边栏搜索与菜单追加迁移（2026-10-16）

接入原始 Search、菜单组登记/排序及全部折叠/展开代码。New 与滚动导航、会话列表的 CSS 作用域按新版结构分开；接通空白区的新建会话/环境，修正批量折叠的累积更新与焦点恢复。14 个相关测试文件 164 项通过，生产构建及五份官方 CSS 校验通过，当前原始 helper 共 56 个。

详情见 [sidebar-current-source-20261016.md](sidebar-current-source-20261016.md) 和 `verification-sidebar-current.json`。本轮处理 sidebar-01/02/03/04/09/10，导航徽标、环境分组、描述行及其余审计仍须继续，整套 1:1 尚未完成。

## Code 侧边栏徽标与状态追加迁移（2026-10-16）

Projects 接入官方 compact Beta 徽标；Code 会话状态移到右侧并使用原始状态判定与 Pulse，普通行去掉旧空闲圆点，Pinned 保留 Code 图标，More 改为横向三点。标题使用原始溢出观察/渐隐组件，手动未读与自动完成的未读分开持久化。15 个相关测试文件共 175 项通过，生产构建及五份 CSS 校验通过，当前 helper 共 63 个。

新截图中的环境卡片、未提交工作入口和 Clawd 已有接线；满屏蓝色字符背景仍未定位到源码，`home-18` 保持未完成。详细依据和适配边界见 [sidebar-status-current-source-20261016.md](sidebar-status-current-source-20261016.md)，验证记录为 `verification-sidebar-status-current.json`。本轮属于补充核对，没有把 PR/环境描述行或整套前端标成完成。

2026-10-16 后续补充：侧栏 PR 已换成当前源码的状态图标、数量和预览卡片，并接到本地已有的分支 PR 数据。保留官方 250ms 悬停、键盘预览和事件隔离逻辑；详情见 [sidebar-pr-current-source-20261016.md](sidebar-pr-current-source-20261016.md)，验证记录为 `verification-sidebar-pr-current.json`。本地仍是每会话一个分支 PR，多仓库服务、环境描述行、完整行控件及蓝色字符背景未完成，整体 1:1 状态不变。

## Code 原始会话行与 Metadata（2026-10-17）

Code 行已改为当前原始 `KT`，由官方代码控制双行布局、状态／PR 槽位、渐隐、触摸选中态和重命名；旧外层背景不再叠加。Show → Metadata 接入真实分支与目录，保留官方分组去重、置顶抑制和阻塞状态优先级。重命名保留 250ms 进入保护、输入法处理、取消焦点和失败回退。

18 个相关测试文件 **191 项通过**，生产构建及五份官方 CSS 校验通过；当前 71 个 helper、15 个共享依赖模块／1599 bindings。详情见 [sidebar-row-current-source-20261017.md](sidebar-row-current-source-20261017.md)，验证记录为 `verification-sidebar-row-current.json`。More 按钮、完整筛选菜单、可选 emoji 增强、远程服务及蓝色字符背景等仍待接入；整体 1:1 目标保持未完成。

### More 控件及共享 CDS 后续（2026-10-17）

右侧 More 已继续接入原始 `fE`、CDS `bl` Button 和 `Ro` Icon，共享提取图不再用 StartButton/StartIcon 替代这两个原始控件。接通 compact 图标尺寸、官方 paint、长按按键／busy 保护和点击隔离，同时消除全局 native-control reset 对当前行的字号／内边距覆盖。菜单内容和其余未完成项仍由后续阶段处理。

详见 [sidebar-button-current-source-20261017.md](sidebar-button-current-source-20261017.md) 和 `verification-sidebar-button-current.json`。扩展光标规范检查发现环境对话框／Workflow 两处既有 selector 不在 allowlist，单独记录；未把这项失败记为通过。

最终相关回归为 18 文件 **195/195 通过**，生产构建、71 个 helper、15 模块／1705 bindings 和五份 CSS 来源检查通过，旧备份保留。额外光标扫描 198 项中 1 项既有失败如上；没有把整套 UI 标为完全一致。

## Code 分组／排序与日期分桶追加迁移（2026-10-17）

Code 菜单改为直接提取当前 `XH` 的 session-list JSX、`Ce` 分组选项及 `eU/tU/ZH` 控件；源码表达式和参数适配均写入 manifest。分组、升降序、Metadata、空分组、嵌套显示与恢复默认设置已接本地持久偏好，键盘切换分组后使用原始 `aU/oU` 恢复焦点。Filter 按钮继续使用原始 CDS Button。

排序改用 `hN/gN/_N/bN` 与 `BR/VR`，家族顺序改用 `iz/oz`，日期分桶直接使用 `BC/VC/GC/KC`。按创建时间分组时，Older 的批量归档／删除遵守原始 `bulkScope`，排除最近活跃的整组嵌套会话。Status 分组取消经典布局的活动天数截断；非 Code 的经典路径保留。

相关 19 个测试文件 214 项通过，随后包含最终渲染断言的 20 项专项重跑通过，合计覆盖 215 个不同用例。生产构建通过；当前 helper 来源模块增至 80，shared graph 仍为 15 个模块／1705 个绑定，五份官方 CSS 和旧版备份检查通过。验证只使用源码、受控事件与 SSR；未进行 GUI 验证。详情见 `docs/sidebar-sort-current-source-20261017.md` 和 `analysis/code-ui-unpack-20261015/source-migration/verification-sidebar-sort-current.json`。

仍未完成：View all 所需的独立 Sessions／归档页面、独立手动 section、Routines 显示服务及其他审计项。新版菜单已不再包含旧状态筛选子菜单；归档数据仍加载且可由现有搜索命中，但这不等于完成了官方归档页面。完整前端 1:1 状态仍为 false，审计台账未因此整批升级为完成。

## Sessions／归档页面追加迁移（2026-10-17）

上一阶段的 View all 缺口已接上真实页面：原始 `Du` 页面／标签／搜索／空态表达式及 `Ou/ku` 会话内容接入本地记录，底层页面、响应式 header、tabs、table、徽标、时间与菜单按钮使用官方依赖。Code 不参与该页多选，保持官方分支。归档记录进入 Archived，旧 status 偏好不再改变新版侧栏的 active-only 范围。

标题搜索、300ms debounce、清空、Unicode 高亮、按引擎保留查询、加载 hold、打开会话／新建和已有会话菜单均已接线。页面有独立历史项，前进／后退恢复页面；Active／Archived 切换替换当前历史项，页面对象不会传入引擎会话读取。外层桌面 chrome 与本地服务仍是 host adapter。

最终相关回归 21 个文件 **238/238 通过**，构建通过。当前 helper 90 个；shared graph 27 个模块／2326 个绑定。完整前端 1:1 仍未完成；不据此整批提升审计台账状态。说明：`docs/sessions-page-current-source-20261017.md`；回执：`analysis/code-ui-unpack-20261015/source-migration/verification-sessions-page-current.json`。

### 安装版本再次更新：2.42304.0（2026-10-17 最终校验发现）

本轮 Sessions 迁移与 238 项测试对应 2.37337.1，不代表刚更新的安装版本 2.42304.0 已完成。新版本已保存到 `reference/installed-2.42304.0-20261017`；508 个 ASAR 条目、4224 个前端文件逐字节核对无复制差异。五份主要样式中四份内容发生变化，shared-frame CSS 相同。正在重新建立源码和依赖差异基线；本地 renderer 尚未切换到新版本资产。旧快照和最初的旧版备份均保留。

### 2.42304.0 样式与侧栏行追加迁移

五份官方主样式及引用字体、图标映射已切换至新快照。新版 owner-window、侧栏 row primitive、fade label 和 row view 直接接入，保留混合文字方向、右侧按钮空间、重命名与 hit-row 行为。尚未迁移模块所需的 63 条旧原始 utility 独立生成并记录来源，不修改新版官方样式。其余 helper 与共享依赖仍须逐步升级，不能声称全量最新版。

28 个相关文件 **299/299 测试通过**，生产构建、官方资产字节与来源检查通过；两个既有 cursor 检查问题一并修复。验证限于源码、SSR 和受控事件。完整交接见 `docs/code-ui-handoff-20261017.md`，回执为 `analysis/code-ui-unpack-20261017/verification-current-design.json`。整体 1:1 仍未完成。
