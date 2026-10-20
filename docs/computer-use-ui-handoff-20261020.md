# 交接：Computer Use 界面官方化（接手用提示词）

在 /Users/oleyyu/claude-ui-lab/app 工作。oleyyu/OpenClaudeDesktop，Electron 应用，分支 ui-next。
这是 Claude Desktop 的开源复刻，UI 从官方包切片复原。

## 最高规则（用户 2026-10-20 明确裁定）

**所有界面必须照官方 Claude Desktop 的 CSS 与设计，不允许本地自创样式。**
做任何界面前，先在 `reference/installed-2.42304.0-20261017/` 找到官方对应物，照抄它的 markup 类名与行为；
官方没有对应物的，停下问用户，不要发明。官方工具类与 token 已全部加载（`index.html` 引入的
`public/assets/v1/c6a992d55-*.css`、`public/assets/current-chat/layout.css`），JSX 可以直接写官方类名。

## 先读

1. `docs/computer-use-ui-css-source-20261020.md` —— 官方 CU 样式分析（授权卡、工具行缩略图、停靠条、活动面板实时卡、
   屏幕光晕 overlay，逐类解析到声明与 token）。这是本轮所有改动的依据。
2. 本地 CU 界面：`src/source-computer-use.jsx`、`src/source-computer-use.css`、`src/computer-use-model.mjs`、
   `src/computer-use-approval-card.jsx`、`src/computer-use-approval-card.css`、`electron/i18n/zh-CN/computer-use.mjs`。
3. 官方 Code 页工具组的接入方式：`src/source-transcript-tool-rows.jsx`（turnStatusRows 开时整组是官方生成代码
   `src/generated/transcript-rows/group-status.mjs`，本地只通过 renderHostRow 画 `computerUse` 宿主行）、
   `src/transcript-sdk-tools.mjs`（engine item → 官方 SDK 工具名）。

官方源码读法：压缩 chunk 用 `node scripts/analyze-code-snapshot.mjs --snapshot reference/installed-2.42304.0-20261017
--baseline reference/installed-2.37337.1-20261015 --output <临时目录>`（在仓库根目录跑）格式化；它只输出自己挑中的
chunk，其余的（如 `shared-130`、`c96d752d0`、`c5f921d63`）用同一套 prettier（`tools/node_modules/prettier`，
parser babel）单独格式化。官方中文：官方包没有简体中文表，zh-CN 由本地按现有词典风格翻译。

## 已完成（未提交，全部在工作区）

- **request_access 授权卡**（官方 c96d752d0 JEe/GEe/ZEe/TT）：复用现有审批卡壳 `SourceApprovalCardView`，
  `approval-card-model.mjs` 的 elicitation 分支识别 computer-use `request_access`（`_meta.computer_use_access`
  或 mcpToolCall request_access），标题四种变体、Reason、能力行在前、应用行（20px 图标、风险行、层级文字
  View only / Click only / All、未安装 50% 透明）、Deny(Esc) + Allow for this session(