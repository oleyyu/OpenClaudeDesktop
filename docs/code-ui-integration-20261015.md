# Claude Desktop 2.37337.1 CSS 接入 OpenClaude

后续已开始按官方组件源码替换简化实现，最新状态见 [源码迁移进度](code-ui-source-migration-20261015.md)。下文记录最初 CSS 接入阶段，不能用来证明当前整套前端已 1:1。

已在当前工作区接入官方 CSS、字体与图标，并将 Code 首页、输入框、侧栏、标题栏调整到新版 presets 布局。使用 OpenClaude 原有本地数据和操作；不是替换为官方整套前端运行时，也不代表 334 项审计差异全部实现。

## 旧版源码备份

`/Users/oleyyu/claude-ui-lab-backups/openclaude-0.2.186-before-ui-2.37337.1-20261015-194822/`

15,814 个文件、1,059,923,958 字节，逐文件校验通过，包含此前未提交代码。备份开始时已修改的 10 个样式相关文件在副本中还原为迁移前版本。备份目录内的 `BACKUP-README.md` 和 `BACKUP-MANIFEST.json` 记录排除项、范围、哈希及恢复方式；本项目凭据为 `analysis/code-ui-unpack-20261015/old-source-backup.json`。后续修改只发生于工作区，没有继续修改备份。

## 官方资源与本地适配

`app/scripts/prepare-ui.mjs` 的设计系统来源固定为 `reference/installed-2.37337.1-20261015/ion-dist/assets/v1`：

- `shared-frame-CegduNQ2.css`
- `shared-styles-C6yuIsHz.css`
- `c6a992d55-CNGsCU46.css`
- 对应字体和 `shared-frame-BjUcQ1Qc.js` 的 371 个图标码点。

三份 CSS 的所有声明均直接保留，只将 `/assets/v1/` 资源 URL 改为 `./`。字节核对和 SHA-256 见 `analysis/code-ui-unpack-20261015/css-integration-integrity.json`，构建完整来源记录在 `app/public/ui-provenance.json`。两个旧生成模块中的 `mr-xs`、`pl-[2px]` 随新版工具类改为逻辑方向写法，生成器和 manifest 一并更新。

首页使用官方 b$/BQ/VQ 的卡片及行 utility classes，新增 `source-code-start.jsx` 将最近目录、待审批会话和已保存建议任务接到本地服务。删除旧首页的 greeting/stats/Action Center 显示，保留登录和密钥提示。Next steps 点击将真实任务填入输入框，并从待办库移除。

输入框的 Add 移到单行卡片内，环境、权限、模型、effort、用量位于下方。分支、worktree、附加目录和环境设置移入环境菜单；已附加目录和自定义组仍能移除。输入、附件、停止、审批、现有工作流等处理逻辑继续使用本地实现。

侧栏增加完整 Search 入口与 Projects 导航，添加官方 Code 列表属性，使用新版行尺寸和嵌套导轨。标题栏显示 New session，提供真实的草稿 Terminal/Preview 操作；会话中依次为 Terminal、Changes、Preview、Files、更多，窄栏通过更多菜单保留折叠按钮的操作。

## 验证

- `npm run build` 通过：`analysis/code-ui-unpack-20261015/integration-build.log`。
- 11 组相关测试，97 项通过：`analysis/code-ui-unpack-20261015/style-tests.log`。覆盖样式变量、光标、CJK、输入框、侧栏、标题栏及分屏。
- `node scripts/home-page-ui-test.mjs` 通过，使用独立临时数据目录及协议测试服务，不使用真实账号会话。每次验证构建 source manifest，确认运行的是当前源码。
- 实机检查：环境选中状态、worktree 菜单切换、Add 附件菜单、输入后可发送、Next steps 取任务、Files 面板与窄栏菜单、Projects、Chat 首页、中文与深色模式；无 renderer error。
- 实机报告：`analysis/code-ui-unpack-20261015/presets-validation/report.json`；截图同目录 `light-home.png`、`narrow-home.png`、`dark-chinese-home.png`、`session-files.png`、`chat-home.png`。
- 完整回归最终结果：3,486 项，3,474 通过、6 失败、6 跳过。失败为 bypass-carry 1 项、offscreen-suite-registry 2 项、source-field-render 3 项，涉及文件与旧版备份一致。预览恢复测试在独立复跑失败、完整复跑通过，仍记录为不稳定项。
- 完整测试最终记录：`analysis/code-ui-unpack-20261015/integration-tests-final.log`。独立复跑既存失败项记录于 `remaining-regressions.log`；其相关主进程、旧生成模块和测试与备份相同（`baseline-regression-files.json`）。不能把完整测试表述为全绿。

## 范围与限制

本次完成 CSS 资源接入和上述布局/操作适配，不包含官方云环境、远程控制、Nested Sessions 自动汇总、/btw 或 Recap 的后端移植。官方实验开关没有全部开启。截图里的字符雨来源未确认，因此没有虚构背景；没有本地听写服务，不添加假麦克风。尚未进行所有主题、所有面板和 Cowork 的全面视觉验收。

产物是当前源码和 `app/dist` 构建；没有替换已安装客户端、打新安装包或提交 Git。项目原有未提交改动保留。运行入口仍为 `cd app && npm start`。
