# OpenClaude Desktop Bridge（Chrome 扩展）

让 OpenClaude Desktop 通过 DOM（而不是截图和坐标）读取、操作你在 Chrome 里打开的页面，对应官方的 Claude in Chrome。

```
Chrome 扩展 (claude-ext/, MV3)
  ↕ chrome.runtime.connectNative("com.openclaude.chrome_bridge")
native host (app/electron/browser/native-host.cjs)   4 字节小端长度 + JSON
  ↕ unix socket  /tmp/openclaude-chrome-bridge-<用户名>/<pid>.sock   同样的帧格式
OpenClaude Desktop 主进程 (app/electron/browser/bridge-client.cjs)
```

消息形状统一为 `{ method, params, tool_use_id }`，`method` 取
`execute_tool / get_status / permission_request / tool_response / notification`，细节见
`app/electron/browser/protocol.cjs`。

## 在自己的 Chrome 里装上

1. 注册 native host（写入 `~/Library/Application Support/Google/Chrome/NativeMessagingHosts/com.openclaude.chrome_bridge.json`，
   launcher 放在 `~/Library/Application Support/OpenClaude Desktop/chrome-bridge/native-host.sh`，全部绝对路径）：

   ```bash
   node app/electron/browser/install.cjs
   ```

2. 加载扩展：打开 `chrome://extensions` → 右上角打开「开发者模式」→「加载已解压的扩展程序」→ 选本目录 `claude-ext/`。
   扩展 ID 必须是 `gackkfbnmmbigiaafjakioegnbjakdef`（由 `manifest.json` 里的 `key` 公钥决定，native host 的
   `allowed_origins` 只认这个 ID）。

3. 卸载 host：

   ```bash
   node app/electron/browser/install.cjs --uninstall
   ```

改了 `service-worker.js` 之后在 `chrome://extensions` 里点扩展卡片上的刷新按钮。扩展的日志在卡片上的
「Service Worker」检查窗口里；host 的日志在 `/tmp/openclaude-chrome-bridge-<用户名>/host.log`。

## 一条命令验收

不碰你自己的 Chrome：用 Playwright 带的 Chrome for Testing 以 headless、临时 profile 加载本扩展，
host 只注册在那个 profile 里（`<profile>/NativeMessagingHosts`），socket 也在临时目录。
在 Electron 主进程里发 `ping`，扩展回 `pong`，并打印 host 的双向日志：

```bash
cd app && npm run check:chrome-bridge
```

没有 Chrome for Testing 时先 `npx playwright install chromium`，或用 `CHROME_PATH` 指向一个 Chromium（品牌版 Google Chrome
已不接受 `--load-extension`）。不需要浏览器的协议与路由单测：`node --test tests/chrome-bridge.test.mjs`。

## 进度

- [x] P0 通道：扩展 ⇄ host ⇄ Electron，`ping` → `pong`
- [ ] P1 navigate / read_page / find
- [ ] P2 form_input / computer（ref 寻址）
- [ ] P3 javascript_tool / browser_batch
- [ ] P4 tabs_create / tabs_context
- [ ] P5 注册进 agent-tools（group `browser`，默认 deferred）
