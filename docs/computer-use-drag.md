# app_drag：事件序列、回读与验收

实现日期：2026-10-20。分支：`ui-next`。

## 接口与坐标

```text
app_drag(app, window_id?, coordinate, to_coordinate, path?, button?)
```

需要会话中的完整应用授权，以及目标窗口最近一次 `app_screenshot`。终端、IDE（包括 VS Code）的 click 层级仍禁止拖拽；本轮按用户确认保留该策略，返回 `tier_refused`，不为验收绕过权限。

`coordinate` 和 `to_coordinate` 必填。可选 `path` 是两者之间的 2–20 个途经点；所有点必须位于截图全分辨率 `frameWidth × frameHeight` 内。返回图片的缩放不改变坐标。`button` 默认 `left`，也接受 `right`、`middle`。

service 对每个点复用 `budget.cjs` 的 `frameToWindowLocal` 与 `windowLocalToScreen`。原生端重新解析窗口，用 `EventFactory.target` 校验窗口位置和坐标，并检查点的窗口归属。屏幕坐标为左上原点的全局点，支持负坐标副屏。

## 投递与安全

事件始终由现有 `EventFactory.mouse` 构造，经 `Dispatcher` 排序并 `postToPid`，不进入全局 HID 输入流。

1. `mouseMoved` 到起点，等待 16 ms。
2. 匹配按钮的 `mouseDown`，clickState=1。
3. 路径按全分辨率像素距离约每 10 px 采样，12–60 个移动事件；每段至少保留一个终点，重复点跳过。前 3 个移动间隔为 20 ms，其余为 10 ms。
4. `mouseUp` 到最后投递的点；正常完成时是终点。
5. 正常完成后再 `mouseMoved` 到终点。

四道原生闸门沿用 `SessionState.rawInputRefusal` 的顺序：安全输入 → 200 ms 内用户输入 → focused 模式的前台授权归属 → 锁屏。公开 app_drag 使用明确坐标，不引入 focused 参数；原生 focused 检查仍保留。service 做初检，原生在准备、按下、每次移动和完成时重查。事件序列使用单调时钟，上限 3000 ms，超时返回 `drag_timeout`。

所有事件（尤其松开事件）在按下前分配，发送时更新 timestamp。任何中途闸门或超时都会通过统一清理发送 mouseUp，清理不受闸门拦截；结果含 `mouseUpSent`。准备阶段就被拦截时没有按下，不发送多余的 mouseUp。原生锁防止两次拖拽交错。用户输入只允许在尚未按下时退避重试，部分投递的拖拽不会自动重放。

## 窗口身份：本轮发现的真实缺项

已有工厂设置了 pid、字段 91/92 和 `CGEventSetWindowLocation`，但没有设置 AppKit 事件自身的窗口号。Cocoa 测试应用实际收到了鼠标事件，却记录到 `NSEvent.windowNumber = 0`，因此文本控件没有响应。

在同一工厂的路由函数中补充字段 51 后，接收端记录的 windowNumber 与目标窗口一致，TextEdit 和独立 Cocoa 文本控件均成功拖选。没有替换鼠标事件构造方式。原生测试用真实 CGEvent 检查 pid、字段 51/91/92、clickState、屏幕坐标，并通过 `CGEventGetWindowLocation` 检查局部坐标。

`NSEvent.windowNumber` 是事件关联的窗口设备标识，参见 [Apple 文档](https://developer.apple.com/documentation/appkit/nsevent/windownumber)。字段 51 是私有实现细节，本项目以本机事件回读与接收端记录验证它，不能把字段 91/92 当作同一概念。

## 回读语义

原生端保留起点的 AX 元素，在按下前读取 `AXValue`、`AXSelectedTextRange`、`AXPosition`；松开后仍读同一个元素，不以终点处另一元素的值替代。文本、滑块、行和标签选择其语义控件。值不可读的 SwiftUI 滑块若有 `AXValueIndicator`，改读可移动滑块头的位置；不能用外层滑轨的固定位置断言失败。

松开后以 50 ms 间隔回读，最多约 500 ms；有变化时要求两次连续结果一致，避免把倒数一个移动事件产生的临时选区（例如 29 字符）当成最终结果。

按本轮用户确认，service 的结果映射为：

| 情况 | 结果 |
| --- | --- |
| 可比较属性有变化 | `ok`, `verified:true`, `readback:"changed"` |
| 属性可读但均未变化 | `ineffective`, `drag_ineffective`, `verified:true`，包含 before/after |
| 不能回读，或原元素消失、必要属性缺失 | `ok`, `verified:false`, `readback:"unavailable"` |
| 中途安全中止 | 保留原中止原因，即便已经有部分状态变化也不能覆盖成成功 |

`verified:true` 表示回读到了变化，不表示理解了模型的全部目标。接口没有期望值参数；精确的 30 字符、70% 等目标由验收测试另行断言。`verified:false` 只确认事件已投递并松开。

## 系统应用的判定

- 第三方 Cocoa/Electron 应用拖拽生效，可证明事件实现可用。
- （2026-10-21 起）Finder、Dock、SystemUIServer 的完整拖拽若可读状态不变，与其他应用一样映射为 `drag_ineffective`：官方 2.42304.0 没有按 bundle id 区分系统应用的拖拽原因码，也没有拖拽的 AX 等价（官方规格 §1.2.2）。原先的 `system_app_ignores_posted_events` 已删除。不自动改用全局事件，也不重复整个拖拽。
- Finder 不保证总是无效。本轮补齐窗口身份后，真实临时文件已经拖入子目录：必须如实返回成功，不能根据 bundle ID 硬编码失败。源元素消失时 `verified:false`，测试另用文件系统确认移动。
- 如果所有应用都无效，先检查 pid、目标进程字段、事件窗口号（包括 AppKit windowNumber，而非只有 91/92）、局部坐标及时间戳。不要把路由缺项误记为系统限制。
- 系统应用确实拒收的场景是平台限制，不应当作通用拖拽实现的 bug；应保留 before/after 和 reason code 供后续判断。

## 测试

```sh
cd app
npm test
node --test tests/computer-use-drag.test.mjs tests/computer-use-drag-native.test.mjs
CU_LIVE=1 node --test --test-concurrency=1 tests/computer-use-drag-live.test.mjs
CU_LIVE=1 CU_LIVE_SYSTEM=1 node --test --test-concurrency=1 tests/computer-use-drag-live.test.mjs
```

默认 npm test 不操作用户桌面。原生 XCTest 使用生产时序函数、注入的闸门/时钟及记录投递器，覆盖四道中途闸门、锁屏、3 秒超时、按下前拒绝、右键/中键及松开位置。不会为测试真的锁住用户电脑。真实 CGEvent 的路由字段另行检查，不以模拟构造代替。

live 测试需要 macOS、已构建的原生模块、Accessibility 和录屏权限，并等待用户输入空闲。TextEdit 只打开并关闭唯一命名的临时文档，不退出用户的 TextEdit；Cocoa fixture 为单独进程；Finder 只使用临时目录。系统亮度测试额外使用 `CU_LIVE_SYSTEM=1`，记住原滑块位置并在 finally 恢复。

本机实测记录：

- TextEdit：选区 `{location:10,length:30}`，API 最终回读一致，mouseUp 已发送。
- Cocoa：同样选中 30 字符；应用事件记录确认目标窗口收到 down/drag/up。独立 NSSlider 的数值 AXValue 从 0.3 拖到 0.7，回读与目标一致。
- Finder：临时 `alpha.txt` 实际进入 `destination/`；源 AX 元素消失，返回 `ok, verified:false`，文件系统独立确认成功。模拟“状态不变”测试覆盖 `drag_ineffective`（2026-10-21 前为系统限制 reason code）。
- VS Code：按用户决定保留 click 层级，测试确认 `tier_refused` 且不调用原生 drag。
- 系统设置亮度：本机 macOS 27.2 的外层 AXSlider 不提供 AXValue（`noValue`），但提供可移动的 AXValueIndicator，测试按滑块头位置验证百分比。最终实测持续被 `user_actively_typing` 闸门阻挡；按用户决定停止重试，记录为受阻，**未完成系统亮度 30% → 70% 验收**。Cocoa NSSlider 的通过结果不替代这一项。
- 锁屏中断：通过注入 `screen_locked` 验证按下后的中断与 mouseUp 清理；四道闸门和超时均有生产时序单测。未实际锁屏。

最终回归（2026-10-21）：`npm test` 退出码 0，5730 项中 5703 通过、0 失败、27 跳过。默认跳过的桌面实测结果以上述单独运行记录为准。Computer Use 与 i18n 定向回归另有 127 通过、14 跳过；原生拖拽时序与真实事件字段的 7 项 XCTest 通过。
