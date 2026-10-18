# 新版共享页签源码接入（2.37337.1）

本轮按用户要求仅检查源码，执行 SSR、模拟 DOM/键盘事件与构建；没有操作图形界面、测量真实窗口像素、发起模型请求或替换安装应用。

## 来源与接入边界

`cfe7c4b3b-DiLi7yJE.js` SHA-256：`5c61ddea4c554d926352137ca7eb5f1914a57ef4fdc93b884b1e7667fd97c77e`。

`app/scripts/extract-view-tabs.mjs` 从固定参考目录提取 `we`（共享页签组件）及依赖的原始声明，包括 `he` 溢出/紧凑/裁切/伸展计算、`de` 页签、`re/ie` 溢出菜单、Base UI Tabs、CDS Menu/ContextMenu/Tooltip，以及原来的懒加载 popup 模块。共 11 个模块、1530 个声明。生成目录是 `app/src/generated/view-tabs/`；manifest 记录输入/输出哈希、声明清单、模块边界和必要初始化语句。生产准备脚本逐字复算验证。

保留 Base UI 的 `Ar({before,after})` 模块初始化语句（原始偏移 291103、SHA-256 `c03dfd1952431a960935f82ef07b5f2fde6a2a5b5f8b47e12b9111d1a3c3c463`）。它在函数声明之外注册 React 19 store hook；省略会导致 `syncHooks` 未初始化，SSR 曾检出并已修复。懒加载模块保留公开的 `SheetPopupHost` 导出名。

宿主边界明确为：统一使用本项目 React/ReactDOM；原 vendor 的 CommonJS React 工厂返回同一宿主 React，避免两个运行时；Icon/Button 接既有本地 CDS 控件。`source-view-tabs.jsx` 只提供本地 density 和文档方向。页签样式来自原始 utility CSS；单独 scoped reset 消除本地全局 button reset 的覆盖，没有改写五份官方 CSS。

## /btw 调用处的差异

`cccc2cf0a-CTtFjPG4.js` 的 `FT`（约 13698–13729）传 `tabs/activeId/onActivate/onReselect/onClose/minTabWidth:92/labels`，**没有传 `onReorder` 或 `onCreate`**。共享组件支持排序不代表 `/btw` 应开启排序。本地调用保持创建顺序，不显示新增按钮或拖动排序提示。

已替换此前手写的横向滚动页签：当前使用原始溢出菜单、逻辑方向、隐藏/紧凑标签、伸展和选中页签可见性计算、Base UI 键盘焦点及菜单关闭处理。源 `NT` 语义也补入宿主：保留当前已归档或元数据未到达的页签；关闭当前页签时优先后一个、再前一个，跳过已在别处展示的相邻会话。

主窗口按父会话保持窗格和页签 header 的实例，子 composer 仍按子会话重建。切换子会话不再销毁整个共享页签组件；读取状态也按子会话隔离。

## 验证

- `view-tabs-source.test.mjs` 直接调用提取组件/原始 handler 和测量 hook：SSR/RTL 属性、懒加载公开导出、Delete 长按拦截至 keyup、锁定页签、溢出行方向键关闭、typeahead Backspace、LTR/RTL 窄宽度溢出及选中项滚动、宽度恢复。
- 加上 `/btw` 生命周期、渲染、模拟 RPC、布局、输入和审批键回归，13 个文件 **147 项测试通过**。日志：`analysis/code-ui-unpack-20261015/source-migration/view-tabs-tests.log`。
- 生产构建通过，并校验 48 个已有辅助模块及新增 11 个页签模块。日志：`build-view-tabs.log`；机器记录：`verification-view-tabs.json`。原有大 chunk、混合静态/动态导入提示保留。SSR 中 Node 的 localStorage 实验性提示不影响测试结果。

## 尚未完成的整体范围

`layout-08` 仍是 `partially-implemented`。官方共享页签本体已接入；完整跨窗口协议、其他服务与实验条件仍要继续对齐。后续已接入 [原始焦点策略与原生 Plan 实施接续](btw-focus-plan-source-20261016.md)，Plan 的关闭/归档生命周期仍待处理。Queue/Steer 文字主路径见 [子会话 Queue / Steer 接入](btw-queue-source-20261016.md)，完整展示与附件分支仍待处理。其余审计项也没有因为本轮页签测试通过而被标记完成。上述验证仅证明所述源码与模拟行为，不是整套新版界面像素验收。

2026-10-17 后续：共享提取图已包含原始 CDS `bl` Button 和 `Ro` Icon，替换上文所述的本地 Icon/Button 边界。页签原有 density/方向 provider 继续生效。详见 `sidebar-button-current-source-20261017.md` 和该阶段的最终验证记录。
