# OpenClaude 最新源码迁移交接（2026-10-17）

目标仍是 Code UI 按官方源码尽可能 1:1 接入，**没有完成整体一致性验收**。用户要求只看源码，不使用 GUI、浏览器、截图或真实模型／核心／GitHub 请求进行验证。当前没有仍在修改代码的代理或后台构建任务。

## 可靠基线

- 工作区：`/Users/oleyyu/claude-ui-lab`。大量未提交文件包含多轮及其他工作，必须保留，不能 reset/clean 或覆盖未知改动。
- 最新安装版及快照：**2.42304.0**，`reference/installed-2.42304.0-20261017`。508 个 ASAR 条目、4224 个前端文件逐字节核对没有复制差异。源内 8 处二进制完整性元数据差异已与复制结果分别记录。
- 新版静态报告：`analysis/code-ui-unpack-20261017/`，包括 summary、ui-map、imports、readable、CSS 差异和 snapshot-verification。3548 个模块解析成功，无缺失导入、无解析错误。哈希文件名变化不等于功能变化。
- 原有差异审计：`docs/code-ui-audit-20261015-claude.md` 和 `analysis/code-ui-audit-20261015-claude/`，334 个保留项、4 个剔除项，针对较早版本，不能直接认定为最新版结论。
- 累计迁移说明：`docs/code-ui-source-migration-20261015.md`；旧台账：`analysis/code-ui-unpack-20261015/source-migration/migration-status.json`。
- 最初备份仍在：`/Users/oleyyu/claude-ui-lab-backups/openclaude-0.2.186-before-ui-2.37337.1-20261015-194822/`。

## 最后已落地的内容

1. 五份主要官方 CSS、其引用的字体、图标映射已切换至 2.42304.0。CSS 只修改 `/assets/v1/` 为相对资源路径；图标映射与字体来自同一快照。入口配置在 `app/scripts/current-design-assets.mjs`，资产准备在 `prepare-ui.mjs`。
2. 新版本的 `owner-window`、侧栏 row primitive、fade label、row view 直接从对应 AST 声明生成。新版包含标题 `dir=auto`、混合文字方向渐隐、实际起始 padding 测量、右侧按钮空间、重命名方向及 hit-row 点击区域。
3. 当前共有 91 个 Code helper；**仅上述 4 个标明 2.42304.0**，其他仍是前一阶段版本。共享依赖图仍是 27 模块／2326 bindings 的 2.37337.1 版本。不能把新版 row 的依赖也宣称已全量升级。
4. 对未迁移组件暂存 **63 条旧快照原始 utility 规则**，独立于新版官方样式，位于 `app/public/assets/legacy-utilities.css`；来源、引用文件、上下文、哈希见 `app/public/style-compatibility.json`。生成器 `app/scripts/prepare-style-compatibility.mjs` 仅保留新版缺少而本地源码仍引用的 utility，并保留 media 条件。引用扫描是保守文本匹配，不是实际渲染可达性证明。迁移所有者模块后应缩减这份兼容层，不能以此声称完全一致。
5. 独立 Sessions／Archived 页面、侧栏排序、状态／PR／元数据、环境卡片、未提交工作入口、Clawd、嵌套会话和 /btw 等已有前序实现；各模块版本和适配范围以生成 manifest 及逐阶段说明为准。
6. 修正了两个既有 cursor 检查问题：环境 Edit 链接使用官方 `df-link-btn` 例外，Workflow disclosure 用交互光标变量。新版官方 `--cds-font-grad` 自身只用默认值而未声明，token 测试现在识别官方可选变量契约，仍拒绝本地自造变量。

## 最后验证

回执：`analysis/code-ui-unpack-20261017/verification-current-design.json`。

- 28 个相关测试文件，**299/299 通过**，无跳过：`current-design-final-tests.log`。
- `cd app && npm run build` 通过：`build-current-design-final.log`。只有既有大 chunk 和静态／动态导入混用警告。
- 官方样式／字体字节比对、图标映射、独立兼容规则来源检查通过。
- 未安装／替换应用包，未运行真实核心服务，未做 GUI 验证，没有使用 banked reset。
- 验证源码指纹在回执中。修改应用源码后必须重新生成和验证，不能沿用这个数字作为新结果。

## 建议后续顺序

1. 确认当前安装版本；若再次更新，保存新快照，明确版本，不覆盖已归档证据。以 2.42304.0 为当前已保存基线，先完成受影响模块，不凭文件名机械替换。
2. 按新版 AST 重建共享依赖映射，并逐模块迁移；原始 CSS class、变量、DOM、状态和交互必须配套。检查 `extract-code-ui-current.mjs`、`extract-view-tabs.mjs` 等生成器，修改生成器后重生成，不能仅手改 generated。
3. 顶部 Chat／Code 模式切换仍是 host 实现，官方新版 `df-app-switch`／SegmentedControl 是明确下一处入口；手动 sections／groups、其他未核对区域也仍有缺口。
4. 对照台账处理首页／环境、会话、composer、嵌套任务、文件与终端等未完成项。用户截图中的全页蓝色字符背景仍未在本地官方源码中定位到；**没有接入**，不得自行绘制后冒充官方实现。
5. 每批源码定位 → 原始绑定／CSS 接入 → 本地宿主适配 → SSR／受控行为测试 → 必要构建 → 更新证据和台账。某项依赖不可用就记录明确缺口，转向独立可做项。

Workflow 说明 `docs/workflow-compatibility-alignment-20261016.md` 描述本项目的运行器与预算／恢复规则，**不证明接手者当前环境一定提供 Workflow 工具**；应实际检查可用工具及调用结果。不要将写了计划当作已启动后台任务。
