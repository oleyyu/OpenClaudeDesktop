# 子会话焦点与 Plan 接续（2.37337.1）

本轮仍只对照本地官方源码、执行模拟事件/传输与服务端渲染测试，没有运行图形界面或请求模型。

## 原始焦点代码

从 `c5259f582-BzMTVGQg.js` 原样提取 `V/H/U/W/G/le/K/de`：按子会话记录焦点请求；每个 document 只装一次捕获阶段的 keydown/pointerdown 监听；挂载时读取并消费一次请求。判断式是 **最后一次输入时间 `U <= askedAt + 1000`**。它不是“等待一秒就过期”：即使创建耗时很久，只要没有越过这一宽限的后续输入，仍可以聚焦。

另提取 `shared-25` 的 `Uf/Wf/qf`（ownerDocument）和 `cccc2cf0a` 的 `Vg`（当前焦点是否属于该 pane）。三个模块均进入 `extract-code-ui-current.mjs` 的来源/输出指纹及构建校验；现有原始 helper 模块总数为 51。

宿主按 `c73f45bc3 Ns/Fs` 在打开意图产生时记下 askedAt，异步创建或等待上一次关闭后不重新计时。页签激活记录新意图；关闭当前页签选择邻居时，仅当焦点属于该 pane 或文档没有活动控件时才要求聚焦。重选当前页签只聚焦，不重置选区。

`SourceBtwContent` 按子会话 key 挂载，消费原始 `de` hook；header 保持挂载，因此不破坏已接入的原始页签组件状态。宿主输入框适配把新焦点放到草稿末尾，并拒绝聚焦已卸载、归档或已经被其他子会话替换的输入节点。被动恢复窗格没有新的焦点意图。

## Plan 卡片与原生 Codex 接续

`cccc2cf0a zS` 的 `RS = ["acceptEdits"]`、`planExitDefaultAcceptAllowed: true` 和 `ee ? "hidden" : "contents"` 是依据。子会话 review 卡不再带出 Auto/Bypass 菜单；保留普通接受和接受并允许编辑。等待 review 时输入框保持挂载、草稿保留，通过原始 hidden/contents utility 类切换可见性。

原生 Codex 结束 Plan turn 后返回 plan item，没有官方 Claude 的挂起 ExitPlanMode 请求。这个边界使用本项目既有 `planHandoff` / `SourcePlanHandoffCard` 适配：

- 只看子会话自己的最新、已完成且无错误的 plan turn；运行中、已有审批、正在发送或队列非空时不再发起实施。
- Stay in Plan 只记下当前连接/子会话/turn 的选择，不发消息。
- Implement 发送本地协议的 `Implement the plan.`，带子会话模型、目录、权限和默认 collaboration mode。目标只允许 ask / acceptEdits，不读取或修改主会话的模式。
- 只在返回有效 turn ID 后记录已回答并采用新权限。失败保持 Plan，可重试；重复点击不会创建第二个 turn；旧连接的完成不覆盖新连接的选择。
- 后端 `prepareTurn` 在确认成功后保存子会话自身 permission/ownTurnIds；首轮原始边界提醒依旧只添加一次。渲染器临时确认值在新权威元数据到达时让位，避免覆盖后续模式修改。
- 子卡片的 Escape / Cmd+Enter / Cmd+Shift+Enter 接入已有审批作用域与按键保护。

这部分是原生协议适配，不是把官方服务端的 ExitPlanMode 实现直接搬过来。

## 验证与剩余范围

21 个相关测试文件共 **233 项通过**。覆盖一秒边界、无新输入的长等待、仅消费一次、跨子会话焦点隔离、关闭邻居时保持别的 pane 焦点、草稿末尾、Plan 可见性/选项、实施目标与模型隔离、重复/过时请求、失败重试、旧连接的实施回执不覆盖新连接选择、确认后的权限持久化，并包含上一轮 Queue/Steer 等回归。

`layout-08` 仍保持部分实现。原生 Plan 等待确认时关闭窗格，目前仍沿用空闲子会话的归档规则；官方 ExitPlanMode 的挂起审批会保留会话，这项关闭生命周期还要对齐。完整窗口协议、完整队列展示/附件、服务与实验开关以及其余审计项也未完成。当前测试没有证明整套前端或所有窗口状态完全一致。

最终构建、五份官方 CSS 和源码指纹见 `analysis/code-ui-unpack-20261015/source-migration/verification-btw-focus-plan.json`；测试日志为同目录 `btw-focus-plan-tests.log`。

后续更新：本节所列原生 Plan 关闭/归档缺口和 Stay 的仅内存状态已在 [btw-plan-lifecycle-source-20261016.md](btw-plan-lifecycle-source-20261016.md) 处理。此文保留上一阶段的验证范围，最新验收见后续记录。
