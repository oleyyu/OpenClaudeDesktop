# Windows 兼容性排查（2026-11-07，feat/windows，基于 0.2 / ui-next 7de4f4de）

4 路只读排查（主进程启动链路、文件/Git/预览、渲染层、DeepSeek 内核桥接），每条都对照代码核实；**都没在真 Windows 上跑过**。
已在本分支修掉的不在此列：PATH 用 `;`、终端 shell、Node/Git 查找与内置 Node 兜底、编辑器 exe、标题栏窗口按钮。

结论：**没有「一启动就崩」的问题**（mac 专用 API 都有保护），但默认的 DeepSeek 内核 + 常用功能有一批必坏点。

**状态（同日）**：下面第一轮的 P0（1–10）和 P1（11–25）已由 4 路 agent 在本分支修掉，单测全过；仍未在真 Windows 上跑过。第二轮见文末。

## P0：默认使用路径上必坏

| # | 问题 | 位置 | 修法 |
|---|---|---|---|
| 1 | App 自己的 MCP 工具（终端、预览、ask、workflow、monitor…）全部不可用：Windows 不能 listen 文件路径的 Unix socket；且 socketPath 在 listen 前就赋值，模型照样看到这些工具、每次调用都失败 | `app/electron/agent-tools-host.cjs:519-524` | win32 用 `\\.\pipe\cd-tools-<随机>`；listen 成功后再赋值 |
| 2 | Agent 跑命令（pwsh）在 Ask / Accept edits 模式下全失败：Windows ACL 沙箱要求工作区不能包含 `%TEMP%`，而默认 cwd 是用户主目录；沙箱内 Node 子进程管道还会 EPERM（npm test、构建工具） | `harness/packages/code-desktop-app/sandbox-shell.js:31-35`，`dsh-sandbox-windows-acl …types-*.js:661`，默认 cwd `codex-app-server/src/index.js:1448` | win32 先不套 ACL 沙箱，改由审批卡把关（或默认 full-access + ask） |
| 3 | 默认模型 deepseek-flash 漏 `description` 时的补丁只认 `bash`，Windows 上的 `pwsh` 调用全部校验失败 | `harness/packages/codex-app-server/src/index.js:898` | 改用 `SHELL_TOOLS.has(candidate.name)`（`jobs.js:48` 已有） |
| 4 | 没有单实例锁：点 X 只是隐藏窗口，Windows 上没有 `activate`，托盘是黑色模板图几乎看不见 → 用户再点图标会起第二个实例，两份内核同写 config | `main.cjs`（无 `requestSingleInstanceLock`），`:2279` 关窗=隐藏，`:4655` activate，`:4595` 托盘图 | `requestSingleInstanceLock()` + `second-instance` 里显示窗口；win32 托盘换彩色 .ico |
| 5 | 弹黑色控制台窗口：用系统 node.exe 跑内核时一直挂着一个，git 调用会闪 | `codex.cjs:305`、`core-manager.cjs:50`、`model-settings.cjs:76`、`main.cjs:16` 的 run、`monitor-service.cjs:147` | 统一加 `windowsHide: true` |
| 6 | 一大批快捷键只认 `metaKey`（Windows 上是 Win 键）：切侧栏、前进后退、Go to file、关闭/重开会话、上传、上下一条提问、⌥⌘ 系列、终端清屏/查找、Ctrl+1…9 跳会话；菜单里写死 `Command+` 的几项也不生效；Ctrl+B 冲突 | `src/shortcuts-dialog-model.mjs:147-177`、`pane-shortcuts.mjs:11`、`chin-shortcuts.mjs:28`、`diff-go-to-file-model.mjs:79`、`session-cycle-model.mjs:31`、`main.jsx:3283`、`composer-keys-model.mjs:102`、`terminal-pane-model.mjs:263-271`、`terminal-find-model.mjs:14,16`、`sidebar-jump-model.mjs:15`、`electron/app-menu.cjs:142-153,200` | 按 `isMacPlatform()` 选主修饰键；菜单 `Command+` → `CmdOrCtrl+` |
| 7 | 渲染层路径只认 `/` 开头：文件引用右键菜单只剩两项、Changes 面板打不开文件、Files 面板开重复标签、改完文件不刷新、「打开文件…」不生效 | `src/file-tool-model.mjs:254-257`、`diff-file-header-model.mjs:85-90`、`file-live-refresh-model.mjs:72`、`main.jsx:1538` | 做一个统一路径工具：识别 `C:\`、`\`，Windows 下不分大小写 |
| 8 | `file://` 拼接不支持盘符：图片附件缩略图、Files 里图片/PDF/视频、对话图片全不显示；预览面板拦截所有 file:// 请求 | `src/file-preview-model.mjs:101`、`media-item-model.mjs:13-15`、`electron/preview-service.cjs:228`、`preview-launch.mjs:270,280-282` | 渲染层 `file:///C:/…`；主进程用 `fileURLToPath` / `pathToFileURL` |
| 9 | 文件名/内容搜索在 win32 被直接关掉（@ 文件、快速打开、内容搜索） | `electron/file-name-search.cjs:119` | 去掉开关，win32 不用 detached / `kill(-pid)` |
| 10 | 多项设置存不下：用 `startsWith('/')` 判断绝对路径 → 项目指令、自定义命令目录、MCP cwd / hooks / skills 路径、writable_roots | `electron/prefs/instructions.mjs:13,62,83`、`prefs/custom-commands.mjs:8`、`prefs/harness-profile.mjs:58`、`custom-commands.cjs:22`、`codex-permissions.mjs:34` | `path.isAbsolute` 或盘符正则；前缀比较兼容 `\` |

## P1：常用功能坏 / 有数据风险

| # | 问题 | 位置 |
|---|---|---|
| 11 | 预览服务器起不来（spawn `npm`/`pnpm` 是 .cmd）；停止时只杀 cmd，vite 残留占端口 | `preview-service.cjs:1272,1342` |
| 12 | monitor 工具写死 `/bin/zsh -lc` | `monitor-service.cjs:89,147,178` |
| 13 | worktree 路径大小写严格比较，Storage 清理可能把**正在用的** worktree 当成未用而 `git worktree remove --force` | `worktrees.cjs:67,77,119` |
| 14 | 停工作流 / 停内核留孤儿进程（`kill(-pid)` 无效，SIGTERM 处理器不触发），可能继续消耗 API；OpenCode serve 残留占端口 | `workflow-service.cjs:124,126`、`codex.cjs:532`、`opencode-bridge/src/server.js:135`、`acp-bridge/src/agent-host.js:55,175,181` |
| 15 | 其它内核（Codex/Kimi/OpenCode/MiMo/ZCode）装不上也检测不到：发布包只按架构选（会下 mac 包）、`ditto`/`hdiutil`、可执行位判断、`apple-darwin` 正则、`.cmd` | `core-manager.cjs:53,148,160,174,201,208,317`、`codex.cjs:164,217`、`extensions/*/manifest.json`、`cores/*.mjs` |
| 16 | ACP 内核（Gemini/Qwen/Kimi/MiniMax）终端命令写死 `/bin/bash`、`/bin/sh`；MiniMax 用 `.pathname` 取 hook 路径（**Mac 上路径带空格也会坏**）；Gemini 的 code_desktop MCP 在 Windows 上会拉起第二个 App | `acp-bridge/src/client-services.js:118`、`server.js:2324`、`agents/minimax.js:228,766`、`app-tools.js:98` |
| 17 | OpenCode bash 工具：`/bin/zsh` 兜底 + `#!/bin/sh` wrapper | `opencode-bridge/src/config.js:154,317`、`sandbox.js:44` |
| 18 | bridge 的 PATH 用 `:` 拆、不认 PATHEXT、`.cmd` 不走 shell；MCP 探测遇 `npx` 报错 | `acp-bridge/src/agents/index.js:42`、`opencode-bridge/bin/app-server.mjs:24`、`zcode-bridge/src/locate.js:27`、`mcp-probe.js:45`、`catalog.js:404`、`mcp-tools.js:19` |
| 19 | 侧聊弹出窗口右上角按钮被系统窗口按钮挡住；弹出/面板窗口顶部只留 36px（WCO 是 40px） | `src/source-side-chat.css:65`、`source-session.css:934,951` |
| 20 | 终端：Windows 路径链接点不了；busy 检测恒 false（关标签不提示、sweep 会停掉在跑的命令）；`lsof`/`ps` 调用失败，中断前空等 1.5s | `src/terminal-pane-model.mjs:359`、`electron/terminal-model.mjs:122`、`terminal-service.cjs:475,583` |
| 21 | 「在终端中打开」用 `open -a Terminal`；扩展包 .zip 导入用 `ditto`；核心命令 shim 写成 `#!/bin/sh` | `main.cjs:1212`、`extension-packs.cjs:275`、`core-manager.cjs:511-517` |
| 22 | `fs.watch` 握着目录句柄：打开过预览的项目不能改名、agent `rm -rf dist && mkdir dist` EPERM、worktree 删不掉（需实测） | `files-watch.cjs:48`、`preview-service.cjs:917` |
| 23 | 「用默认程序打开」黑名单缺 `.msix .appx .msp .mst .psm1 .inf .scf …`，可执行位兜底在 Windows 恒为 0（安全） | `files.cjs:144-145,167` |
| 24 | `repoIdentity` 返回 git 的 `C:/…` 正斜杠路径，Files 面板 git 根对不上 | `git-status.cjs:785` |
| 25 | `ELECTRON_RUN_AS_NODE=1` 会传进用户命令（用内置 Node 时，用户跑 `electron .` 会被当成纯 Node） | dsh-subprocess 环境透传 |

## P2：显示 / 次要

- 写死「Show in Finder」「Finder」约 15 处（已有 `revealLabel` 可复用，`source-session-rail.jsx:357`）。
- 快捷键标签写死 ⌘⌥⇧：`sidebar-palette-model.mjs:129,176,220,223`、`source-composer.jsx:71,875`。
- Windows 上不该出现的设置：Computer use 分组、"Menu bar"（应叫系统托盘）、"Bounce the Dock icon"：`source-settings.jsx:405,572,578`。
- 只按 `/` 取文件夹名，标签显示整条路径（约 15 处，`source-composer.jsx:57` 等），复用 `fileBasename`。
- 保存文件 `rename` 覆盖遇杀软/索引占用偶发 EPERM：`file-editor.cjs:65`、`custom-commands.cjs:157`、`task-backlog.cjs:113`。
- 路径包含判断不分大小写/8.3 短名：`files.cjs:192`、`session-file-access.cjs:13,92`；根目录是 `D:\` 时 `files.cjs:7` 拼成 `D:\\`。
- 内核 thread/list 的 cwd 精确比较（盘符大小写、正斜杠）→ 侧栏可能为空：`codex-app-server/src/index.js:2519`。
- Settings 里 shell 超时/输出上限只认 `bash-sandbox`：`core-settings.js:15-17`。
- Chrome 浏览器桥只支持 macOS（清单路径、sh 启动器、`/tmp` socket）：`browser/install.cjs`、`protocol.cjs:28`、`native-host.cjs:139`。
- 卡片标题写死 `shell: 'bash'`；`new URL(uri).pathname` 取文件引用：`acp-bridge/src/projection.js:111`、`input.js:111`、`opencode-bridge/src/projection.js:187,530`。
- `CODE_DESKTOP_CORE_SYSTEM_PATHS` 用 `:` 拆（测试用变量）。
- 自定义字体兜底列表全是 Mac 字体：`theme-custom-model.mjs:246`。

## 已确认没问题

proxy-env（win32 直接返回空）、`app.dock?.`/`setWindowButtonPosition` 有保护、托管设置路径、PATH/Path 双键（Node 排序取大写）、无 deep link 协议、内核入口用 `fileURLToPath`、approval/sandbox-fs 包含判断两边 realpath、git `/dev/null`、gh 是 .exe、export 文件名非法字符已处理、字体 mono 链含 Consolas、DeepSeek 内核 Windows 上用 PowerShell（7 → 5.1 兜底），不需要 Git Bash。

## 第二轮（workflow：7 个方向找 → 每条对抗核实；报 38 条，确认 34 条）

查的是**修完第一轮之后**的代码。#R1 是本分支修第一轮时引入的。**P0、P1（R1–R10）都已在本分支修掉**（单测在 Mac 上用 platform 参数跑过，未上真 Windows）；P2 未修。

修法里需要知道的取舍：
- R2：只给内核和「跑一条命令」（Monitor、`!命令`）用 Bypass；交互终端标签保留用户机器自己的执行策略。组策略锁定的策略压不过。
- R3：托管设置文件存在但读不了/解析不了时一律关掉 Dynamic workflows（mac 上同样适用，比以前严）。
- R5：Windows 上只读模式（Plan / Chat / review）的每条 pwsh 都弹审批卡；不能弹卡（approvalPolicy=never）时直接拒绝。workspace-write + Auto 仍不受限（见第一轮 #2）。
- R6：UNC / 设备路径在任何文件系统调用前拒绝，覆盖预览 iframe、agent 文件工具、终端可点击路径、终端 cwd、Workflow 文件、会话文件访问、harness 的 read/write/edit/glob/grep 参数；工作区本身在共享盘上时其内部路径照常可用。残留：仓库里指向 `\\host` 的符号链接仍会被 realpath 跟随。
- R7：系统/用户 gitconfig 仍然屏蔽，只把 `core.autocrlf/safecrlf/eol/longpaths/fscache`（仓库自己没设时）和用户**自己登记过**的 `safe.directory` 用 `-c` 带上；不会自动信任打开的文件夹。
- R10：Gemini 启动器的 exe 路径改走环境变量；终端 shim 和 Chrome 宿主启动器的非 ASCII 路径改写成 `%LOCALAPPDATA%` 等变量，仍有非 ASCII 时临时 `chcp 65001`。

### P0

| # | 问题 | 位置 | 状态 |
|---|---|---|---|
| R1 | 打包白名单漏了新加的 `src/host-path-model.mjs`（主进程经 artifact-index → deliverable-records → agent-tool-titles 引到它）→ 打出来的包启动后没有窗口、没有托盘 | `scripts/package-win.mjs:46`、`package.json` 的 package 脚本 | **已修**：两处白名单都加上；package-win 打包前沿 electron/ 的 import 链检查，漏了就报错 |

### P1

| # | 问题 | 位置 | 修法 |
|---|---|---|---|
| R2 | DeepSeek 内核的 pwsh 没带 `-ExecutionPolicy Bypass`：默认 Restricted 策略下 PowerShell 优先选 `npm.ps1` → npm/npx/pnpm 全部「禁止运行脚本」；Monitor、`!命令` 同样 | `dsh-pwsh-local/lib/index.js:202`、`terminal-service.cjs` windowsShellArgs | 内核 env 加 `PSExecutionPolicyPreference=Bypass`；windowsShellArgs 加 Bypass |
| R3 | 托管设置 `managed-settings.json` 带 BOM 或 UTF-16 时解析失败被当成「没有」→ 管理员禁用 workflow 静默失效 | `main.cjs:300` | 按 BOM 解码；存在但解析失败时按最严处理 |
| R4 | Monitor 在 Windows 上没设 UTF-8，中文输出（ping、报错、日志）全是乱码 | `monitor-service.cjs:163` | 复用 bridge 的 POWERSHELL_PREAMBLE；cmd 先 `chcp 65001` |
| R5 | **安全**：为修第一轮 #2 让 pwsh 在 Windows 上不受限后，只读模式（Plan / Chat / review / 只读 workflow agent）既无沙箱也无审批卡，模型可直接写文件 | `harness/.../sandbox-shell.js:46` | win32 + read-only 时 shell 工具一律弹卡；approvalPolicy=never 的只读 agent 直接拒绝 pwsh |
| R6 | **安全**：HTML 预览的子资源路径可解成 UNC（`\\host\share`），realpath 会向远端发 SMB 认证，泄露 NTLM 哈希 | `file-preview-frame.cjs:97`（agent-tools 的 sessionPath 等同理） | 任何 fs 调用前拒绝 `\\`、`//` 开头和 UNC 根 |
| R7 | git 状态查询屏蔽了系统/用户 gitconfig：Git for Windows 默认的 `core.autocrlf=true` 和用户的 `safe.directory` 失效 | `git-status.cjs:19` | win32 不屏蔽，或用 `-c` 显式带上 |
| R8 | 没装 Node（内核跑在 App 自带 Node）时，Workflow runner 启动内核不带 `ELECTRON_RUN_AS_NODE` → 拉起第二个 App，Workflow 全跑不了 | `workflow-service.cjs:120` | command 是 process.execPath 时补 `ELECTRON_RUN_AS_NODE=1` |
| R9 | Workflow runner 裸 spawn 内核，Codex 的 `codex.cmd` 报 EINVAL | `third-party/codex-workflows-runner/src/appServerClient.js:51` | 走 process-tree 的 windowsSpawn |
| R10 | Gemini 的 .cmd 启动器把 exe 绝对路径按 UTF-8 写进批处理，cmd 按 CP936 读 → 路径含中文时 code_desktop 工具起不来 | `acp-bridge/src/app-tools.js:116` | 路径经环境变量传入，批处理里写 `"%OPENCLAUDE_EXE%"` |

### P2

- 编码：pwsh 5.1 写文件默认 UTF-16LE / GBK（`$PSDefaultParameterValues['*:Encoding']='utf8'`）；没设 `PYTHONUTF8` / `PYTHONIOENCODING`；`launch.json` / `package.json` 带 BOM 解析失败；预览服务 cmd 报错是 GBK 乱码；单条 pwsh 命令超过 32767 字符（Windows 命令行上限）会失败。
- 窗口 / 菜单：未读角标和任务栏闪烁在 Windows 上基本没有（可用 `setOverlayIcon`）；`open_in_editor` 带行号时拼出 `vscode://fileC:%5C…`；「导入扩展包」的打开框在 Windows 上选不了 .zip；页面缩放后 WCO 高度（固定 40 DIP）与标题栏对不上，`main.jsx` 的 `box.top < 40` 也没算缩放；右键「Look Up」仅 macOS 有效；Split View 的 Ctrl+Alt 加速键会被 AltGr 触发；View › Reload 的 Ctrl+R 与输入框历史搜索撞键。
- 路径 / 权限：launch.json env 风险提示没按大小写不敏感匹配，也没列 `COMSPEC` / `PATHEXT`；`D:\` 盘根、UNC 共享根会被当成可添加的会话文件夹；agent 文件工具大小写敏感比较 + 盘根拼成 `D:\\` → 误拒。
- 存储：workflow `meta.json` rename 没用 `renameSyncRetry`，EPERM 会直接抛出；启动时同步建「文档\OpenClaude Desktop」没有 try/catch；「检测到的项目」读 VS Code / Cursor / Zed 记录的路径写死 macOS。
- 终端 / 进程：xterm 没设 `windowsPty: { backend: 'conpty' }`；Gemini 后台命令只按 PID 杀（PID 复用会误杀）；MiniMax 停止后台任务靠 `/bin/ps`，Windows 上无效。
- 打包：zip 自带父目录 + 资源管理器再套一层 + harness 深层 node_modules → 约 100 个文件超过 MAX_PATH 260（去掉 `--keepParent`、删 .map/.d.ts、文档写明解压到短路径）；复制 harness 时会跟进 npm 中断留下的 `.dsh-*` 暂存目录里的环形软链接，cpSync 无限递归（过滤 `.` 开头的条目）。
