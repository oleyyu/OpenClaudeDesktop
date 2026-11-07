# Windows 版（x64，便携 zip）

在 Mac 上构建，产物是 `releases/OpenClaude-Desktop-<版本>-win32-x64.zip`。解压后运行 `OpenClaude Desktop.exe`，不需要安装。

**解压到短路径**（如 `C:\OpenClaude`）：包里 DeepSeek 内核的 node_modules 很深，解压到「下载」里默认的「zip 同名文件夹」会有约 100 个文件超过 Windows 的 260 字符路径上限，资源管理器会报错或漏文件。

## 构建

```sh
cd app
npm run package:win
```

`package:win` = `npm run build` + `scripts/package-win.mjs`：

1. 用 `build/icon.iconset` 生成 `build/icon.ico`；
2. `@electron/packager` 打 win32/x64（exe 的图标和版本信息由 resedit 写入，不需要 Wine）；node-pty 只带 `win32-x64` 预编译（ConPTY）；
3. DeepSeek 内核放进 `resources/harness`：以本仓库 `harness/node_modules`（Mac 上实测的那份）为底，把平台包换成 `npm ci --os=win32 --cpu=x64` 装出的 win32-x64 版（缓存在 `releases/harness-win32-x64`，首次自动生成）；所有软链接都复制成实体文件，因为资源管理器解压 zip 不保留软链接；
4. 打包前检查主进程沿 import 链用到的 `src/` 文件都在白名单里；node-pty 的 `prebuilds` 解包到 `app.asar.unpacked`；
5. 用 `ditto` 打 zip。

## 和 macOS 版的差异

| 项 | Windows 上 |
|---|---|
| 窗口 | 隐藏标题栏 + 右上角原生「最小化 / 最大化 / 关闭」（Window Controls Overlay，40px 高，跟随明暗主题）。贴到右上角的那个标题栏（会话工具栏或侧边面板标题栏）自动在右侧让出按钮宽度；没有红绿灯占位 |
| Node | 依次找 `CODE_DESKTOP_NODE`、`Program Files\nodejs`、`%LOCALAPPDATA%\Programs\nodejs`、nvm-windows、Volta、Scoop、PATH。都没有（或版本 < 22.19）时，内核直接跑在 App 自带的 Node（Electron 44 内置 Node 24，`ELECTRON_RUN_AS_NODE=1`），所以解压即可用。首次设置里「安装 Node」会下载官方 `.msi` |
| Git | 找 `Program Files\Git\cmd\git.exe`、用户安装目录和 PATH；「安装 Git」打开 git-scm.com 的 Windows 下载页 |
| 终端 | PowerShell 7（pwsh）> Windows PowerShell > `%ComSpec%`（cmd）。没有 `/usr/bin/script` 回退；ConPTY 起不来时直接报错。ConPTY 读不到前台进程，「是否有命令在跑」记为未知：关标签不提示，自动清理也不会停掉它 |
| PATH | 内核、终端、gh、预览服务的 PATH 用 `;` 拼接，并去掉 Mac 专用的 `/opt/homebrew/bin` 等目录（`electron/host-path.cjs`） |
| 用编辑器打开 | VS Code、VS Code Insiders、Cursor、Windsurf、Zed、Sublime Text（按 exe 位置检测）。JetBrains 系列暂未支持 |
| 不可用 | Computer Use（Swift 原生模块，仅 macOS）、Cowork 虚拟机（Apple Virtualization，仅 Apple Silicon）、操作录制 |

## 还没在真 Windows 上验证的

这一版是在 Mac 上交叉构建的：单元测试和「模拟 Windows 标题栏」截图都在 Mac 上跑过，但 exe 本身还没在 Windows 机器上启动过。需要在 Windows 上确认：

- 能启动，窗口按钮可用，拖动标题栏能移动窗口；
- DeepSeek 内核能连上（设置里填 API Key 后发一条消息）；
- 终端面板能打开 PowerShell，并且有输出（ConPTY 的输出经 node-pty 的 worker 线程读取，该脚本在 app.asar 里，Mac 上无法验证）；
- Agent 执行命令：DeepSeek Harness 带有 `dsh-pwsh-local`（PowerShell 执行器）和 `dsh-sandbox-windows-acl`，但本仓库的 profile 是否在 Windows 上选用它们、bash 工具在没有 Git Bash 时的表现，都还要实测。
