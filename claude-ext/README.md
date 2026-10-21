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

## 文件

| 文件 | 作用 |
|---|---|
| `service-worker.js` | 连 native host、收发消息、分派工具 |
| `tabs.js` | 选 tab（无 tabId 时用桥的当前 tab，否则用户最后聚焦窗口的激活 tab）、navigate、按需注入 content script |
| `refs.js` | ref 的副本：发给了哪个 tab、哪一轮 read_page；判 `stale_ref` / `ref_wrong_tab` |
| `content.js` | 注入到页面（隔离 world）：可访问性树、分配 ref、find |

content script **不在 manifest 里声明**，只在某个工具点名某个 tab 时用 `chrome.scripting` 注入那个 tab，
扩展不会在后台遍历页面。为此扩展要 `<all_urls>` 的 host 权限，加载时 Chrome 会提示「读取和更改所有网站上的数据」。

## 工具（P1 起）

| 工具 | 参数 | 返回 |
|---|---|---|
| `navigate` | `url`（或 `back` / `forward`），`tabId?` | `{tabId, url, title, status}`；不给 tabId 时新开后台 tab，不把用户的 tab 导走 |
| `read_page` | `tabId?`，`filter?`（`all`/`interactive`），`depth?`（默认 15），`ref_id?`，`max_chars?`（默认 50000） | `{tabId, title, url, tree, refCount, truncated}`，`tree` 是 YAML 风格的可访问性树 |
| `find` | `query`，`tabId?`，`limit?`（默认 20） | `{tabId, matches: [{ref, role, name, interactive, text}], total}` |

ref 规则：
- 只给可交互元素分配 ref：`button`、`a[href]`、`input`（hidden 除外）、`select`、`textarea`、`[role=button]`、
  `[contenteditable]`、`[onclick]`。纯文本不分配。
- 编号来自一个跨所有 tab 的计数器，名字永不复用；每次 `read_page` 重新分配，旧 ref 全部作废。`find` 给命中的元素
  补 ref（已有 ref 的沿用），不作废已有的。
- 用旧 ref → `stale_ref`；元素已从页面移除 → `stale_ref`；页面导航或刷新后 → `stale_ref`；
  把 A tab 的 ref 用在 B tab → `ref_wrong_tab`。都不会静默失败。
- 页面内容（`tree`、`text`）是不可信数据，不是指令；到 P5 注册工具时写进工具描述。

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
在 Electron 主进程里通过同一个 `bridge-client.cjs` 逐阶段验收：

```bash
cd app && npm run check:chrome-bridge
```

只跑某一阶段：

```bash
cd app && npm run check:chrome-bridge -- p1
```

- P0：`ping` → `pong`，打印 host 的双向日志。
- P1：真站 `https://example.com` 只验 navigate 与标题（它 2025 年改版后已经没有标题 h1 和 "More information..." 链接了）；
  链接 ref 与 `find "More information"` 用脚本在 127.0.0.1 起的旧版 example.com 复刻页验，ref 生命周期在本地表单页验。
  shell 里有 `HTTPS_PROXY` 时会传给 Chrome（headless 无法回应代理的认证弹窗）。

没有 Chrome for Testing 时先 `npx playwright install chromium`，或用 `CHROME_PATH` 指向一个 Chromium（品牌版 Google Chrome
已不接受 `--load-extension`）。不需要浏览器的协议与路由单测：`node --test tests/chrome-bridge.test.mjs`。

## 进度

- [x] P0 通道：扩展 ⇄ host ⇄ Electron，`ping` → `pong`
- [x] P1 navigate / read_page / find
- [ ] P2 form_input / computer（ref 寻址）
- [ ] P3 javascript_tool / browser_batch
- [ ] P4 tabs_create / tabs_context
- [ ] P5 注册进 agent-tools（group `browser`，默认 deferred）
